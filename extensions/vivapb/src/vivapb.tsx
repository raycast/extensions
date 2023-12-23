import { exec } from "child_process";

exec('open -na "Vivaldi" --args -incognito "duckduckgo.com"', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Error: ${stderr}`);
    return;
  }
  console.log(`Command executed successfully: ${stdout}`);
});
