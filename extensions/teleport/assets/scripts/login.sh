#!/bin/bash

USERNAME=$1
PASSWORD=$2
PROXY=$3
OTP=$4

expect <<EOD
set timeout -1
set env(PATH) $PATH
spawn tsh login --proxy=${PROXY} --user=${USERNAME}
match_max 100000
expect -re {.*?}
send -- "${PASSWORD}\r"
expect -re {.*?}
send -- "${OTP}\r"
expect eof
EOD
