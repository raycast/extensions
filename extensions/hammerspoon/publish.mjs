#!/usr/bin/env zx

import { $ } from 'zx'
import fs from 'fs'
import ora from 'ora'

// disable logging by default because we want to control the exact moment to
// display output
$.quiet = true

const spinner = ora()

const packageJsonPath = './package.json'
const packageJsonStr = fs.readFileSync(packageJsonPath, 'utf8')

try {
  // Get the version from the command line argument
  const targetVersion = process.argv[3]

  if (!targetVersion) {
    throw new Error('Please provide a version number.')
  }

  const DEV_MODE = targetVersion === 'dev'

  if (!DEV_MODE) {
    // Step 1: Make sure lint does not complaint
    await step('Linter', () => $`npm run lint`)

    const prodIcon = 'icon-prod.png'

    // Step 2: Modify package.json icon property and ensure build
    await step('Ensuring Prod Mode', async () => {
      updatePkg({ icon: prodIcon })
      await $`npm run build`
    })

    await step('Checking release commit', async (meta) => {
      const steps = []

      const saveToMeta = (ok) => {
        if (steps.length === 0) {
          return
        }

        const extra = steps
          .map((step) => (ok ? step.name : `${step.name} ${step.completed === true ? 'OK' : 'FAIL'}`))
          .join(', ')

        meta.extra = extra
      }

      try {
        // Check if the release commit already exists
        const commitExists = await $`git log --oneline --grep="release ${targetVersion}"`

        updatePkg({ version: targetVersion, icon: prodIcon })

        if (!commitExists.stdout) {
          const commitStep = { name: 'commit' }

          steps.push(commitStep)

          // If it does not exists we create the commit and tag
          // Step 3: Create a commit
          await $`git add ${packageJsonPath}`
          await $`git commit -m "release ${targetVersion}"`
          commitStep.completed = true

          const tagStep = { name: 'tag' }

          steps.push(tagStep)

          // Step 4: Create a tag
          await $`git tag ${targetVersion}`
          tagStep.completed = true
        }

        saveToMeta(true)
      } catch (error) {
        saveToMeta(false)
        throw error
      }
    })

    console.log(
      '\nAll done now it is time to publish, run:\nnpx ray publish\nafter it dont forget to go back to dev mode with:\nnpm run publish dev'
    )
  } else {
    // Step: Restore the dev icon and ensure build
    await step('Ensuring Dev mode', async () => {
      updatePkg({ icon: 'icon-dev.png' })
      await $`npm run build`
    })
  }
} catch (error) {
  spinner.fail(`Publish failed: ${error.message}`)

  if (error.step && error.cause) {
    console.error('\n--------------------------------')
    console.error(`${error.step} error details:`)
    console.error(error.cause.toString())
    console.error('--------------------------------')
  }

  updatePkg()

  process.exit(1)
}

function updatePkg(newValues = {}) {
  const packageJson = JSON.parse(packageJsonStr)

  for (const [key, value] of Object.entries(newValues)) {
    packageJson[key] = value
  }

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

async function step(stepName, cb) {
  const meta = { extra: '' }
  spinner.start(`Running ${stepName}...`)
  try {
    await cb(meta)
    let succeedMessage = `${stepName} OK`

    if (meta.extra !== '') {
      succeedMessage += `: ${meta.extra}`
    }

    spinner.succeed(succeedMessage)
  } catch (error) {
    let errorMessage = `${stepName} error`

    if (meta.extra !== '') {
      errorMessage += `: ${meta.extra}`
    }

    spinner.fail(errorMessage)
    const stepError = new Error(`Failed to run ${stepName}`, { cause: error })
    stepError.step = stepName
    throw stepError
  }
}
