import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import { parseSecrets, Secret } from "./secrets";

const program = new Command();

type SecretResult = Omit<Secret, "issuer">;

const result: Record<string, SecretResult[]> = {};
const DB_FILE = path.join(process.env.HOME || "", ".local", "share", "ente-totp", "db.json");

program
  .command("import <file>")
  .description("Import secrets from a file")
  .action((file: string) => {
    const rawSecrets = parseSecrets(file);

    rawSecrets.forEach((data) => {
      const item = {
        secret: data.secret,
        username: data.username,
      };

      if (data.issuer in result) {
        result[data.issuer].push(item);
      } else {
        result[data.issuer] = [item];
      }
    });

    try {
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(result));
      console.log("Secrets imported.");
      console.debug("Database path:", DB_FILE);
    } catch (error) {
      console.error((error as Error).message);
    }
  });

// Parse command line arguments
program.parse(process.argv);
