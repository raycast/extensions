# Easy OCR

This extension is used for generating text from screen captured images, detect language with Raycast AI or any few other famous libraries, and it requires Tesseract binary in order to work!

## Tesseract
Tesseract is open source OCR engine, and it needs to be installed locally on your machine.

Easiest way to install Tesseract is through Terminal using Homebrew (if you don't have Homebrew you can find install guide [here](https://brew.sh/)) 

Homebrew installation command (copy and past command bellow to your terminal):

`brew install tesseract`

After installing, verify that Tesseract has been installed correctly by running in your terminal:

`tesseract -v`

If you get response similar to (your version might be different):

`tesseract 5.3.3`

You should be good to go (it's important that you don't get response `zsh: command not found: tesseract`)

## Tesseract Languages

By default, Tesseract supports only English language, but you can install additional languages by running following command in your terminal:

`brew install tesseract-lang`

After installing additional languages, you need to update Easy OCR extension settings in Raycast, and set language you want to use by default.

By default, this extension tries to detect language, you can disable that feature in extension options.


## Possible problems
If you get Tesseract not found error make sure it is installed by running `tesseract -v` in your terminal, and if it's installed, then you need to update its path in Raycast settings.

To find Tesseract path run following command in terminal:

`which tesseract`

and you will get output similar to (depends on how you installed Tesseract):

`/opt/homebrew/bin/tesseract`

Copy that value and go to *Raycast settings -> Extensions -> Paste copied value under "Tesseract binary path"*

If you have any feature requests or find any bugs [PM me](https://github.com/Rafo1994) on GitHub.