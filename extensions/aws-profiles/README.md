# AWS Profiles

Lists all defined AWS profiles from `$HOME/.aws/config` and execute a predefined command or script for a selected profile.

In many companies using Amazon AWS, you will typically have multiple accounts (maybe multiple roles) all setup using aws profiles.
This extension is meant as a quick way to "do something" with one of these AWS profiles.

You will probably need to write a script or prepare a command that you will like to execute for a given profile. In the extension settings you can enter your prefered command / script.

Examples :

- Open AWS console using https://granted.dev/ _assume_ command (default)

     /bin/zsh -l -c "assume -c <profile>"

- Open Terminal and login using sso

     osascript -e 'tell app "Terminal" to do script "aws sso login --profile <profile>"'

- Run custom script to do custom stuff

     /usr/local/bin/my-profile-script -p <profile>
