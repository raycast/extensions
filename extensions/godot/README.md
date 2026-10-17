# Godot Projects

Search the projects from the [Godot 4](https://godotengine.org) Project Manager and open them without going through the Project Manager first.

## Search Projects

Lists your Godot projects, with favorites first and the rest by the date they were last edited. Each project shows its icon, folder, Godot version, a C# tag for .NET projects, and when it was last edited. Projects whose folder or `project.godot` file is gone are marked as missing.

Actions:

- **Open in Godot**: opens the project in the editor
- **Run Project**: runs the project without the editor
- **Show in Finder**
- **Copy Path**
- **Open Project Manager**
- **Reload Projects**

Every project opens in its own Godot window, even when Godot is already running.

## Godot Application

By default, the extension looks for Godot in `/Applications`, `~/Applications`, and anywhere Spotlight finds it. For each project it picks the installed Godot that matches the project's version, or the newest one. C# projects open in the .NET build when you have it. To always use one app, choose it in the **Godot Application** preference.

If the selected Godot is a different version than the one the project was last edited in, the extension asks before opening, because Godot updates the project to its own version.

## Privacy

The extension only reads local files: the project list that Godot saves in `~/Library/Application Support/Godot/projects.cfg` and each project's `project.godot`. It never changes them and makes no network requests.

## Limits

Godot 3 keeps its project list in a different file, and a self-contained Godot (one with an `editor_data` folder next to the app) keeps it next to the app. This extension doesn't read those lists.

## Credits

The Godot Engine logo is by Andrea Calabró and is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
