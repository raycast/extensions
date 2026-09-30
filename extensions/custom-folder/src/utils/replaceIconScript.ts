import { checkPathIsDirectory, sanitizeDirectoryPath } from "./verifications";

export const replaceIconScript = (sanitizedIconPath: string, targetPath: string) => {
  const sanitizedTargetPath = sanitizeDirectoryPath(targetPath);
  const isDirValid = checkPathIsDirectory(targetPath);

  if (isDirValid) {
    return `
      bash -c
      #!/bin/sh
      iconDestination="${sanitizedTargetPath}"
      iconSource="${sanitizedIconPath}"
      icon="/tmp/$(basename "$iconSource")"
      rsrc="/tmp/icon.rsrc"
      
      # Create icon from the iconSource
      cp "$iconSource" "$icon"
      
      # Add icon to image file, meaning use itself as the icon
      sips -i "$icon"
      
      if [ -d "$iconDestination" ]; then
          if [ -f "$iconDestination"/$'Icon\r' ]; then
              rm "$iconDestination"/$'Icon\r'
          fi
          osascript -e 'tell application "Finder" to update item POSIX file "'"$iconDestination"'"'
      
          # Take that icon and put it into a rsrc file
          DeRez -only icns "$icon" >"$rsrc"
      
          # Apply the rsrc file to the destination
          SetFile -a C "$iconDestination"
      
          touch "$iconDestination"/$'Icon\r'
          Rez -append "$rsrc" -o "$iconDestination"/$'Icon\r'
          SetFile -a V "$iconDestination"/$'Icon\r'
      fi
      
      rm "$rsrc" "$icon"
      
      if [ -f "/tmp/cf-custom-emoji.png" ]; then
        rm "/tmp/cf-custom-emoji.png"
      fi
    `;
  }
  return undefined;
};
