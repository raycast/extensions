#!/bin/bash

USERNAME=$1
PASSWORD=$2
PROXY=$3
OTP=$4

expect <<EOD
set timeout 60
set env(PATH) $PATH
spawn tsh login --proxy=${PROXY} --user=${USERNAME} --mfa-mode=otp
match_max 100000

expect {
  -nocase -re "password" { send -- "${PASSWORD}\r" }
  timeout { puts "ERROR: timed out waiting for the password prompt"; exit 1 }
  eof { catch wait result; exit [lindex \$result 3] }
}

expect {
  -nocase -re "otp|token|second factor" { send -- "${OTP}\r" }
  timeout { puts "ERROR: timed out waiting for the OTP prompt"; exit 1 }
  eof { catch wait result; exit [lindex \$result 3] }
}

expect eof
catch wait result
exit [lindex \$result 3]
EOD
