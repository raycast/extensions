set -e

SCRIPT_DIR="$PWD"
echo "copy from: $SCRIPT_DIR"
echo "copy to: $FORK_DIR"
cd "$SCRIPT_DIR"

# Using :? will cause the command to fail if the variable is null or unset
rm -rf "${FORK_DIR:?}"
mkdir "$FORK_DIR"

rsync -av "$SCRIPT_DIR"/. "$FORK_DIR"/ \
  --exclude .git \
  --exclude .idea \
  --exclude .fleet \
  --exclude node_modules

echo "DONE"