# Raycast ShareX

This is a simple extension that allows you to control the open source screenshot tool [ShareX](https://getsharex.com/) right through [Raycast](https://www.raycast.com/).

> [!NOTE]
> I've had some issues using the Steam edition of ShareX. If possible, please download ShareX from their website or from Github.

### Example

> [!IMPORTANT]
> Make sure to make ShareX autostart with Windows. Otherwise, the first command that you run through Raycast will not work and will just start ShareX instead. 
>
> Raycast will *usually* also prompt you to set the path to your ShareX.exe file. Please make sure you set the correct file.

Open Raycast and run the "Capture Region" command.

The "main" Raycast window will now close, and ShareX's region screenshot tool will open.

### Technical details

This works because ShareX allows you to use hotkey actions aswell as workflows as command line arguments. For example, when you go ahead & run the "Image Editor" command with a selected file through Raycast, Raycast will execute the following command:

```bash
ShareX.exe -ImageEditor "file path"
```

This would open ShareX's image editor with your selected file. 

> [!TIP]
> You can read about all other command line arguments that ShareX supports [here](https://getsharex.com/docs/command-line-arguments)!

### Quick start

Install the required dependencies:

```bash
npm install
```

Run the extension in development mode

```bash
npm run dev
```

You should be able to find the "Hello" command in Raycast!

See the [Raycast Developer Documentation](https://developers.raycast.com) for more information!
