# Pass
Create passwords and search using pass cli.

What is required:
- Pass [Project](https://www.passwordstore.org/)
Can be installed with ``brew install pass``

- Pass-tail - getting details about pass file [Project](https://github.com/palortoff/pass-extension-tail)
For this moment required to be build with makefile.
1. Clone repo ``git clone https://github.com/palortoff/pass-extension-tail.git``
2. Change line ``PREFIX ?= /usr`` in makefile to ``PREFIX ?= /opt/homebrew``
3. Install ``sudo make install``

- Pass-otp - get One-time pasword from pass file [Project](https://github.com/tadfisher/pass-otp)
For this moment required to be build with makefile.
1. Clone repo ``git clone https://github.com/tadfisher/pass-otp.git``
2. Change line ``PREFIX ?= /usr/local`` in makefile to ``PREFIX ?= /opt/homebrew``
3. Install ``sudo make install``

Before using extension please init password store with ``pass init "ZX2C4 Password Storage Key"``. This command will return something like ``/home/zx2c4/.password-store`` - copy this path for later use.

During configuration You will be required to enter ``Path variable``, in most setups it will be ``/opt/homebrew/bin:/usr/bin:/bin``

As last step setup path to password-store that we created.