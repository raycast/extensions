#!/usr/bin/env bash
. "$( dirname "${BASH_SOURCE[0]}" )/init.sh"

check_extension(){
    git diff --cached --name-status | while read status file; do
        # do a check if try to commit jupyter notebooks
        extension=$1
        if [[ $file =~ $extension$ ]] ; then
            echo "Please remove *.$extension files before committing"
            exit 1
        fi
    done
}

check_extension "$@"
