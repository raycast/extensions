# Openfortivpn connection

The openfortivpn extension allow connect to VPN with default config from your config file and allows to type one type password (Two-factor authentication token).

## How to install

Simplest way to install openfortivpn
```
brew install openfortivpn
```

## Use Sudo

The settings provide the option to run openfortivpn and pkill command with sudo (as root). Before using this extension, make sure your user is set up for passwordless use of the sudo openfortivpn command. However, if you don't already know what this means or how to do it, you probably shouldn't do it. Doing it poses an considerable security risk and (if done wrongly) might break your macOS installation. If you still wanna do it, make sure to use visudo. You have been warned.

Despite the aforementioned risks, I included the option because it adds an essential functionality: To see processes which are not owned by your own user.