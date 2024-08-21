#! /bin/bash

# Publish the Sublime extension to the prod Raycast store.

# Patch code
npm run patch-prod

# Setup the raycast-extensions repo
pushd "../raycast-extensions"
git checkout main
git pull
BRANCH_NAME="sublime-$(date +'%Y-%m-%d_%H-%M-%S')"
git checkout -b $BRANCH_NAME

# Sync code
rm -rf ./extensions/sublime
cp -r ../sublime ./extensions/sublime/
rm -rf ./extensions/sublime/.git

# Create PR
git add .
git commit -m "Add Sublime extension"
git push --set-upstream origin $BRANCH_NAME

popd

# Reset local state
git reset --hard
