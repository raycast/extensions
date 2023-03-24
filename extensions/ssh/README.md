# SSH/SFTP for raycast

Open SSH/SFTP connections from raycast with autosuggestions based on SSH config files and your history.


![image](https://github.com/marlkiller/ssh/blob/main/doc/sample.gif?raw=true)


## Usage
The main keyword is ssh:
- ssh [query] — View and filter known SSH connections.
  - [enter] — Open an SSH connection instead.
  - [cmd + enter] — Open an SFTP connection instead.
  - [cmd + control + c] — Copy SSH Command


## Configuration

|  Name      | default      | description  |
|  ----      | ----         | ----         |
| sshConfig  | true         |Reads hosts from `~/.ssh/config`|
| history    | true         |Reads hosts from history|
| sshApp     | Terminal.app |Set the default application to open `ssh://..`|
| sftpApp    | Terminal.app |Set the default application to open `sftp://..`|
