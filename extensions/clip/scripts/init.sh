#!/usr/bin/env bash
# @Author: benbenbang
# @Date:   2020-08-12
# @Last Modified by:   Ben Chen
# @Last Modified time: 2020-08-13

set -euo pipefail

_CURRENT_DIR=$(dirname "${BASH_SOURCE[0]}")

# Fetch scripts Root
SCRIPTS_CI_DIR="$(cd "${_CURRENT_DIR}"/.. && pwd)"
export SCRIPTS_CI_DIR

# Fetch Airflow Root
GIT_ROOT=$(git rev-parse --show-toplevel)
export GIT_ROOT

RED='\033[0;31m'
NC='\033[0m'
CYAN='\033[0;36m'
GREEN='\033[1;32m'
GREY='\033[1;36m'

# Prepare log file
HADOLINT_ERROR="${HOME}/.cache/hadolint/log.txt"
mkdir -p $(dirname $HADOLINT_ERROR)
