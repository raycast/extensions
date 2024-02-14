# n Node Version Management

Support for managing node versions with n (https://github.com/tj/n)

## Setup

Before you can use this extension, you have to set two settings:

- The path to you n executable
  - You can find it with `which n`
- The path to the directory you store your node versions in
  - The default value is `/usr/local`
  - If you chose a custom directory you can find it with `echo $N_PREFIX`