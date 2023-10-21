# Easy OCR

This extension is used for generating text from screen captured images, and it has two options for OCR engines:
1. Tesseract
2. Google Cloud Vision

## Tesseract
Tesseract is open source OCR engine, and it needs to be installed locally on your machine.

Easiest way to install Tesseract is through Terminal using [Homebrew](https://brew.sh/)

Homebrew installation command (copy and past command bellow to your terminal):

`brew install tesseract`

After installing, verify that Tesseract has been installed correctly by running in your terminal:

`tesseract -v`

If you get response similar to (your version might be different):

`tesseract 5.3.3`

You should be good to go (it's important that you don't get response `zsh: command not found: tesseract`)

## Google Cloud Vision
For this method you will need to add your credit card info, but Google has free plan which should be sufficient for most users.

In order to use Google Cloud Vision you need to:
1. Log in to [Google Cloud Console](https://console.cloud.google.com/)
2. [Create a project](https://developers.google.com/workspace/guides/create-project) in Google Cloud Console
3. Search for Vision API and enable it
4. [Add billing method](https://support.google.com/googleapi/answer/6158867?hl=en) to your project (you will need to add your credit card info) 
5. Create service account - there are some YT tutorials on how to do this, so I'm not going to explain in detail
6. Once you create service account you can download JSON file with all required credentials - you only need *private_key* and *client_email* 
7. Add *private_key* and *client_email* to extension preferences
NOTE: *client_email* is NOT your private email, it is email which will Google provide you in JSON file

Warning: This extension is not compliant with the Terms of Service of Google nor Google Cloud. Use at your own risk.

## Possible problems
If you get Tesseract not found error make sure it is installed by running `tesseract -v` in your terminal, and if it's installed, then you need to update its path in Raycast.

To find Tesseract path type in terminal:

`which tesseract`

and you will get output similar to (depends on how you installed Tesseract):

`/opt/homebrew/bin/tesseract`

Copy that value and go to *Raycast settings -> Extensions -> Paste copied value under "Tesseract binary path"*

If you have any feature requests or find any bugs [PM me](https://raycastcommunity.slack.com/app_redirect?channel=@U061RQMECP9) on Raycasts Slack channel.