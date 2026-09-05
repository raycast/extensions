#!/bin/sh

script=$(cat)

case "$script" in
  *activateWithOptions*)
    printf '%s\n' 'window-ambiguous'
    ;;
  *)
    printf '%s\n' 'unexpected script' >&2
    exit 64
    ;;
esac
