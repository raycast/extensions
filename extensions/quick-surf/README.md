## Description

This extension is for users who Surf frequently between browsers or mailbox clients.

Select anything, Surf anywhere!

**Main features:**

1. Specify a browser to open a ***URL*** or ***Text*** that is selected or on the clipboard.
2. Specify the mailbox application to edit email with ***Email addresses*** or ***mailto:*** link (in the form of "mailto:hello@raycast.com") that is selected or on the clipboard.
3. Support Search Bar input:
   Enter ***URL*** or ***Text*** to search or open web page quickly.
   Enter ***Email addresses*** or ***mailto:***  followed by email address to edit email (Separate multiple addresses with "***;***").
4. Recommend setting shortcut keys for this extension to Quick Quick Surf. For example, "Opt+S".

**How to Quick Surf?**

This extension prioritizes the detection of the selected text and recognizes the selected text faster than the clipboard response. Therefore, it is recommended to use the "Select-Surf" method (i.e. select the text and open Quick Surf).

In the video, use "Opt+S" as a shortcut to invoke the Quick Surf command. Using shortcut keys will speed up your work.

"Enter url, text, email..." is also supported, Quick Surf can also be your quick searcher and editor for emails.

https://user-images.githubusercontent.com/36128970/157411385-33a83ac7-f6ae-4390-ab09-871d25c7c2d3.mp4


**Preference:**

*Surf Engine* - the default search engine for searching text.

*Sort by* - Surfboard sorting method.

**Known issues:**

If the application in Surfboard is uninstalled, it will not be automatically removed from Surfboard, please press the "cmd+enter" shortcut on the "More Boards" screen to remove the invalid application.

# More details

****
Quick Surf is inspired by PopClip and Bumpr, PopClip can select text to pop up a shortcut bar, PopClip or Bumpr can quickly select different browsers to open URLs, Bumpr also supports selecting email clients for "mailto:" links.
The operation flow of "Select-Surf" is very convenient, so I want to implement this feature in Raycast

1. Quick Surf detects the selected text first, then detects the clipboard, and finally detects user input, so it is recommended to select the text and then use this extension (the role of the clipboard and user input is more like a Plan B).
2. Automatic detection success, in the "Type" Section to display the detected content, but the user can still enter the contents of the search bar to search; automatic detection failure, the main action of all list items into the "detect", a click will actively detect, if not detected, will pop up toast prompt the user to enter the content.
3. The text that can be received by this extension is divided into three categories: URL, ordinary text, and email address, the received text will be displayed in the "Type" Section. If it is URL and ordinary text,  use the browser to open; if it is a mailbox address, use the mailbox client to open.
