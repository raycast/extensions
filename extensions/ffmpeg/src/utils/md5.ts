import { execSync } from "child_process";
import * as fs from "fs";

export function getMD5CommandPath() {
  return (
    execSync(`
    locations=(
        /usr/local/bin
        /usr/bin
        /bin
        /usr/sbin
        /sbin
        /opt/X11/bin
        /opt/homebrew/bin
        /usr/local/Cellar
    )
    
    for location in "\${locations[@]}"
    do
        if [ -f "$location/md5" ]
        then
            echo "$location"
            exit 0
        fi
    done
    
    echo ""
  `)
      .toString()
      .trim()
      .replace(/\n/gi, "") + "/md5"
  );
}

export function getFileMD5(filePath: string) {
  if (fs.existsSync(filePath)) {
    return execSync(`${getMD5CommandPath()} -q ${JSON.stringify(filePath)}`)
      .toString()
      .trim();
  }
  return "";
}
