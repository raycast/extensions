#!/bin/bash/env bash

set -e
tag=$1

curl -JL https://github.com/li-qiang/my-exoskeleton/releases/download/${tag}/my-exoskeleton-${tag}.zip -o my-exoskeleton.zip
unzip -o my-exoskeleton.zip
