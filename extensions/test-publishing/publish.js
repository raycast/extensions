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
 * @param {string} src  The path to the thing to copy.
 * @param {string} dest The path to the new copy.
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

async function main() {
  try {
    await execPromise("gh auth status", { env: { ...process.env } });
  } catch (err) {
    throw new Error("❌ You first need to install the `gh` cli: `brew install gh && gh auth login`");
  }

  if (!fs.existsSync(forkPath)) {
    const { stderr } = await execPromise("gh repo fork raycast/extensions --remote=true --clone=false", {
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
        throw new Error("❌ Could not fork the extensions repo");
      }

      repo = fork.nameWithOwner.replace(/extensions$/, "raycast-extensions");

      await execPromise(`gh repo rename ${repo} --repo ${fork.nameWithOwner} -y`, { env: { ...process.env } });
    }

    await execPromise(`git clone --filter=blob:none --no-checkout https://github.com/${repo} extensions-fork`, {
      cwd: supportPath,
    });

    await execPromise(`git sparse-checkout init --cone`, {
      cwd: forkPath,
    });

    await execPromise(`git sparse-checkout set extensions/test`, {
      cwd: forkPath,
    });

    await execPromise(`git checkout main`, {
      cwd: forkPath,
    });
  }

  await execPromise(`git checkout -b ext/${packageJSON.name} || git checkout ext/${packageJSON.name}`, {
    cwd: forkPath,
  });

  const currentCommit = (
    await execPromise(`git rev-parse ext/${packageJSON.name}`, {
      cwd: forkPath,
    })
  ).stdout.trim();

  let remoteCommit;
  try {
    remoteCommit = (
      await execPromise(`git rev-parse origin/ext/${packageJSON.name}`, {
        cwd: forkPath,
      })
    ).stdout.trim();
  } catch (err) {
    //
  }

  if (remoteCommit && remoteCommit !== currentCommit) {
    throw new Error("need to pull first");
  }

  const extPath = path.join(forkPath, "extensions", packageJSON.name);

  await execPromise(`rm -rf ${extPath} || true`);

  copyRecursiveSync(__dirname, extPath);

  await execPromise(`git add . && git commit -m 'Add ${packageJSON.name} extension' && git push`, {
    cwd: forkPath,
  });

  // make sure the branches we work with are up to date
  // await execPromise("git checkout release && git pull && git checkout master && git pull");
  process.exit(0);
}

main();
