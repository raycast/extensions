import { checkPathIsDirectory, sanitizeDirectoryPath } from "./verifications";

export const replaceIconScript = (sanitizedIconPath: string, targetPath: string) => {
  const sanitizedTargetPath = sanitizeDirectoryPath(targetPath);
  const isDirValid = checkPathIsDirectory(sanitizedTargetPath);

  if (isDirValid) {
    return `
      bash -c
      #!/bin/sh
      # Sets a custom icon to a directory
      # Usage setIcon.sh /path/to/iconImage /path/to/targetFolder
      iconSource=${sanitizedIconPath}
      iconDestination=${sanitizedTargetPath}
      icon=/tmp/$(basename $iconSource)
      rsrc=/tmp/icon.rsrc
      echo $icon
      echo $iconSource
      
      # Create icon from the iconSource
      cp $iconSource $icon
      
      # Add icon to image file, meaning use itself as the icon
      sips -i $icon
      
      if [ -d $iconDestination ]; then
          # Destination is a directory
          # If the Icon? file already exists - delete it by updating the item via applescript, a simple rm wouldn't trigger a render refresh
          if [ -f $iconDestination/Icon? ]; then
              rm $iconDestination/Icon?
              osascript -e 'tell application "Finder" to update item POSIX file "'"$iconDestination"'"'
          fi
      
          # Take that icon and put it into a rsrc file
          DeRez -only icns $icon >$rsrc
      
          # Apply the rsrc file to
          SetFile -a C $iconDestination
      
          touch $iconDestination/$'Icon\r'
          Rez -append $rsrc -o $iconDestination/Icon?
          SetFile -a V $iconDestination/Icon?
      fi
      
      echo $iconDestination
      
      rm $rsrc $icon
    `;
  }
  return undefined;
};
