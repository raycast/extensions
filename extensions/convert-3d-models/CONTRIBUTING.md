# Contribution Guidelines and Tips

## Adding Formats

I potentially missed some popular formats that FreeCAD supports as I typically do not use all of them. Further, FreeCAD may add additional format support in the future. Adding these formats is pretty trivial thankfully with FreeCAD's Python engine and its generally universal conversion. 

A few spots need new entries for additional formats and are noted below. Consult [this list](https://wiki.freecad.org/Import_Export) from FreeCAD for the formats that it is able to import/export. 

### Importing Files

The extension here does not consider all files to selected to be "models" in the FreeCAD sense. The script currently relies on "Part Import" and "Mesh Import" for importing the selected files into FreeCAD. As there are some files that FreeCAD can *export* to but not directly *import*, the list is actually assymetrical. For example, the script is able to *export* to an `.amf` file but cannot import one. 

### Exporting Files

The easiest formats to add are those that rely on the "Part Export" and "Mesh Export". "Part Export" in FreeCAD language is equivalent to NURBS data (also called parametric in the extension) and "Mesh Export" exports mesh formats. Some formats, on the other hand, rely on "Std Export" which is a separate collection of unique file handlers. An example of one in action is for the `.dae` filetype, which uses the `importDAE` module. 

### Areas to Update

**Note:** Please use a uniform extension throughout (i.e., `.step` instead of `.stp`; `.jpeg` isntead of `.jpg`) for multi-extension formats. 

`package.json`:

Add the following to the package.json in the `Convert Models...` preferences to enable the toggle for the format.

```ts
{
    "label": "EXTension",
    "name": "showEXT",
    "description": "Whether to show [FORMAT] as a conversion option. [NOTES ABOUT THE EXPORT]",
    "type": "checkbox",
    "default": true, // make false if experimental
    "required": false
},
```

`src/convert.tsx`:

Adjust the following line to reflect the new format type.

```applescript
const FORMATS = ["3MF", "AMF", "BRP", "DAE","IGS", "IV", "OBJ", "OFF", "PLY", "SMF", "STL", "STEP", "X3D", "X3DZ"];
```

`src/utilities/utils.ts`:

If FreeCAD is able to *import* the format with "Mesh Import" or "Part Import", add the extension to the `getSelectedFinderModels()` and `getSelectedPathFinderModels()` functions.

Otherwise, do **not** edit `utils.ts`. 

`src/assets/freecad_convert.py`:

If FreeCAD exports to the format with "Mesh Export", add the extension to:

```python
mesh_formats = ['.3mf', '.amf', '.iv', '.obj', '.off', '.ply', '.smf', '.stl', '.x3d', '.x3dz'] 
```

Otherwise, if FreeCAD exports with "Part Export", do **not** edit `freecad_convert.py`. If FreeCAD uses "Std Export", add the appropriate handler function similar to the example provided with `.dae`.

`src/utilites/preferences.ts`:

Add the preferences types to `export interface ConvertPreferences { . . . }` following the examples provided.

---

## Adding Quick Converts

I've, by default, included "one click" conversions to popular formats like STL, OBJ, and STP (STEP). Because of the way this extension was built, it's incredibly easy to add new quick conversions if you use some other format very frequently.

You can simply duplicate any of the existing `quickConvert___.tsx` files and replace:

```ts
const quickConvertFormat = "STL"; 
```

with your preferred format. Be sure to edit `package.json` with your new Command.

---

## Building and Publishing

See Raycast's guide on building and publishing the changes in their friendly [developer documentation](https://developers.raycast.com/basics/contribute-to-an-extension).

In short, run `npm install && npm run dev` to set up the live extension in Raycast. When you're happy with your changes, run `npx ray lint --fix` and `npm run build` and ensure it compiles without errors. 