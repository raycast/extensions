<p align="center">
  <img width=180 src="https://user-images.githubusercontent.com/29053796/210111931-5f01926c-ea46-4fa9-abde-b2f8787e7875.png">
</p>


# Korean Spell Checker for Raycast

한국어 맞춤법/문법 검사기

This is a raycast extension with a command to check spelling/grammar errors in your Korean text.

## How to install

Install raycast, and visit [extension store](https://www.raycast.com/store) to download it.

## Check Korean Spelling

This is the only command of this extension. It allows you to submit your text for spelling checks by entering it into a form on the main screen. Once submitted, it will quickly scan for any mistakes. You can then review the highlighted errors and correct them as needed. After the spelling errors have been corrected, you can easily copy the final version of the text by clicking the 'Copy Corrected Text' action.

<img width="1000" alt="main screen" src="https://user-images.githubusercontent.com/29053796/210114030-2c782c03-4894-49b5-933d-0ad4b0e9ef0e.png">

There are two ways to insert text into the textarea.

1. Manually write into it, or paste your text.
2. Drag any text in another app, and simply open the extension with a shortcut command. The text will automatically get pasted into the textarea.

<img width="1000" alt="result view" src="https://user-images.githubusercontent.com/29053796/210114068-f420fdb6-9992-49e3-bd3d-b2c5a14133e3.png">

You can browse through the result by using arrow keys or search for a keyword. The left side is showing the list of errors, and the right side has all the details for that specific error you choose.

<img width="1000" alt="actions" src="https://user-images.githubusercontent.com/29053796/210114087-6aaa2f5f-1d6e-48d3-aef5-15cd046490da.png">

Click `Actions` on the right corner or press `cmd`+`k` to see actions you can do. You can correct your errors, copy the original/corrected version of text, and even open twitter with corrected text!

<img width="1000" alt="correcting errors" src="https://user-images.githubusercontent.com/29053796/210114143-a3b54ab3-a3bb-4a32-a562-9af55b992904.png">

When you click the `Edit word...` action (or press enter), you'll see the spell checker's suggestions for your error. Click the word you want to replace with and it will be updated. Also note that you can choose the word by pressing `ctrl` + `index of word`. For example, if you want to replace your original word with the first suggested word, you can do that with `ctrl` + `1`. To revert, press `ctrl` + `0`.

<img width="1000" alt="see selected word" src="https://user-images.githubusercontent.com/29053796/210114164-23e88ddc-a8b4-48ef-93fd-a4a798d1d2b9.png">

Then you'll see which word you selected!

## Shortcuts

- `ctrl` + `index of word`: Select word
- `ctrl` + `0`: Revert to original
- `ctrl` + `c`: Copy corrected text
- `shift` + `c`: Copy original text
- `ctrl` + `t`: Open in Twitter

## License

Please be sure to use this extension in accordance with the MIT license and the terms of use specified by Nara Info Tech(나라인포테크) and AI Lab @ Pusan National University. It is important to respect the rights of the creators and owners of the spell checker, and to ensure that the extension is only used for non-commercial purposes. For more information, please visit the [original website](http://speller.cs.pusan.ac.kr/).
