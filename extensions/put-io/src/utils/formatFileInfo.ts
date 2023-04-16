import PutioAPI, { IFile } from "@putdotio/api-client";

const formatFileInfo = (file: IFile) => {
  if (file !== undefined) {
    return `
### ${file.name || "(no name)"}
![](${file.screenshot})
    `;    
  } else {
    return `
    # No file selected
    `;
  }
}

export default formatFileInfo;
