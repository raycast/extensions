import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function copyImageToClipboard(gifUrl: string): Promise<void> {
  const script = `
    set gifURL to "${gifUrl}"
    
    -- Create a temporary file path for GIF
    set tempFolder to (path to temporary items folder as string)
    set tempFile to tempFolder & "temp_gif_" & (random number from 1000 to 9999) & ".gif"
    
    try
        -- Download the GIF using curl
        do shell script "curl -s -o " & quoted form of POSIX path of tempFile & " " & quoted form of gifURL
        
        -- Copy the GIF file to clipboard
        set the clipboard to (read file tempFile as «class GIFf»)
        
        -- Clean up the temporary file
        do shell script "rm " & quoted form of POSIX path of tempFile
        
        return "success"
    on error errorMessage
        -- Clean up the temporary file if it exists
        try
            do shell script "rm " & quoted form of POSIX path of tempFile
        end try
        error "Failed to copy GIF: " & errorMessage
    end try
  `;

  try {
    await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);
  } catch (error) {
    throw new Error(`Failed to copy GIF to clipboard: ${error}`);
  }
}
