#!/usr/bin/expect -f
set timeout -1
set password [lindex $argv 0]

spawn /bin/bash -lc {curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh | /bin/bash}
expect {
  -re "(P|p)assword:|password for .*:" {
    send -- "$password\r"
    exp_continue
  }
  eof
}
catch wait result
exit [lindex $result 3]
