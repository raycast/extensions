const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { promisify } = require("util");
const os = require("os");

const supportPath = path.join(os.homedir(), "Library/Application Support/com.raycast.macos.debug");
const forkPath = path.join(supportPath, "extensions-fork");

const packageJSON = require("./package.json");

const execPromise = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      console.log("");
      resolve(answer);
    });
  });
}

function assertIsOkAnswer(answer) {
  if (!answer.match(/^(yes|y)$/i)) {
    process.exit(0);
  }
}
function assertIsNotNoAnswer(answer) {
  if (answer.match(/^(no|n)$/i)) {
    process.exit(0);
  }
}

/**
 * Look ma, it's cp -R.
 */
function copyRecursiveSync(src, dest) {
  var exists = fs.existsSync(src);
  var stats = exists && fs.statSync(src);
  var isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(function (childItemName) {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * Return the owner and repo name of the extensions fork. If it didn't exist on GH, it'll create it.
 */
async function getForkRepoName() {
  const { stdout, stderr } = await execPromise("gh repo fork raycast/extensions --remote=true --clone=false", {
    env: { ...process.env },
  });

  let repo;
  if (stderr.match(/ already exists$/)) {
    repo = stderr.replace(/ already exists$/, "");
  } else {
    const forks = JSON.parse(
      (await execPromise("gh repo list --fork --json nameWithOwner,parent", { env: { ...process.env } })).stdout
    );
    const fork = forks.find((x) => x.parent.owner.login === "raycast" && x.parent.name === "extensions");

    if (!fork) {
      console.error(stdout);
      console.error(stderr);
      console.error("❌ Could not fork the Raycast extensions repo");
      process.exit(1);
    }

    // `extensions` is a bit too common so we will rename the fork to `raycast-extensions`
    repo = fork.nameWithOwner.replace(/extensions$/, "raycast-extensions");

    await execPromise(`gh repo rename ${repo} --repo ${fork.nameWithOwner} -y`, { env: { ...process.env } });
  }

  return repo.split("/");
}

/**
 * Clone the extensions fork in the support folder
 */
async function cloneFork(owner, repo) {
  await execPromise(`git clone --filter=blob:none --no-checkout https://github.com/${owner}/${repo} extensions-fork`, {
    cwd: supportPath,
  });

  await execPromise(`git sparse-checkout init --cone`, {
    cwd: forkPath,
  });

  await execPromise(`git sparse-checkout set extensions/${packageJSON.name}`, {
    cwd: forkPath,
  });

  await execPromise(`git checkout main`, {
    cwd: forkPath,
  });
}

async function isPublishingUpdate(branch) {
  try {
    await execPromise(`git show-ref --quiet refs/heads/${branch}`, {
      cwd: forkPath,
    });
    return true;
  } catch (err) {
    return false;
  }
}

async function assertUpToDate(branch) {
  const currentCommit = (
    await execPromise(`git rev-parse ${branch}`, {
      cwd: forkPath,
    })
  ).stdout.trim();

  let remoteCommit;
  try {
    remoteCommit = (
      await execPromise(`git rev-parse origin/${branch}`, {
        cwd: forkPath,
      })
    ).stdout.trim();
  } catch (err) {
    //
  }

  if (remoteCommit && remoteCommit !== currentCommit) {
    console.error("❌ Need to pull first");
    process.exit(1);
  }
}

async function assertSomethingToPublish() {
  const status = (
    await execPromise(`git status --short`, {
      cwd: forkPath,
    })
  ).stdout.trim();

  if (status.length === 0) {
    console.error("❌ Seems like there is nothing new to publish");
    process.exit(1);
  }
}

async function isPRAlreadyOpen(branch) {
  const prs = JSON.parse(
    (
      await execPromise(
        `gh pr list --repo raycast/extensions --author mathieudutour --state open --json headRefName,url`,
        {
          cwd: forkPath,
        }
      )
    ).stdout.trim()
  );

  return prs.find((x) => x.headRefName === branch)?.url;
}

async function main() {
  try {
    await execPromise("gh auth status", { env: { ...process.env } });
  } catch (err) {
    console.error(
      "❌ Raycast extensions are published on GitHub.\nTo automate this process, you first need to install the `gh` cli. Please run:\n\nbrew install gh && gh auth login && ray publish"
    );
    process.exit(1);
  }

  const [owner, repo] = await getForkRepoName();

  if (!fs.existsSync(forkPath)) {
    await cloneFork(owner, repo);
  }

  const branch = `ext/${packageJSON.name}`;

  const isUpdate = await isPublishingUpdate(branch);

  // regardless of whether it exists or not, we checkout the branch
  await execPromise(`git checkout -b ${branch} || git checkout ${branch}`, {
    cwd: forkPath,
  });

  await assertUpToDate(branch);

  const extPath = path.join(forkPath, "extensions", packageJSON.name);

  // update local fork with current change
  await execPromise(`rm -rf ${extPath} || true`);
  copyRecursiveSync(__dirname, extPath);

  await assertSomethingToPublish();

  // Commit and push
  await execPromise(
    `git add . && git commit -m '${isUpdate ? "Update" : "Add"} ${
      packageJSON.name
    } extension' && git push -u origin ${branch}`,
    {
      cwd: forkPath,
    }
  );

  const existingPR = await isPRAlreadyOpen(branch);
  if (existingPR) {
    console.log(`\n\n🚀 Your submission has been submitted!

It will be reviewed by the Raycast team shortly.

You can see the submission here:
${existingPR}`);

    // make sure the branches we work with are up to date
    // await execPromise("git checkout release && git pull && git checkout master && git pull");
    process.exit(0);
  }

  const PRBody = `## Description

Add the ${packageJSON.name} extension.

## Type of change

- ${isUpdate ? "Bug fix / improvement for my extension" : "New extension"}

## Screencast

TODO

## Checklist

- [ ] I read the [extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [ ] I read the [documentation about publishing](https://developers.raycast.com/basics/publish-an-extension)
- [ ] I ran \`npm run build\` and [tested this distribution build in Raycast](https://developers.raycast.com/basics/prepare-an-extension-for-store#metadata-and-configuration)
`;

  const prURL = (
    await execPromise(
      `gh pr create --base main --head ${owner}:${branch} --title "${isUpdate ? "Update" : "Add"} ${
        packageJSON.name
      } extension" --body "${PRBody}" --repo raycast/extensions`,
      {
        env: { ...process.env },
        cwd: forkPath,
      }
    )
  ).stdout.trim();

  console.log(`\n\n🚀 Your extension has been submitted!

It will be reviewed by the Raycast team shortly.

You can see the submission here:
${prURL}

Be sure to add as much details as possible in the PR description to accelerate the review.`);

  process.exit(0);
}

main();
