import { describe, expect, it } from "vitest";

import { detectDanger } from "../src/lib/danger";

describe("detectDanger", () => {
  it("flags destructive commands", () => {
    expect(detectDanger("rm -rf ./build")).toBeDefined();
    expect(
      detectDanger("rm --recursive --force ./important-directory"),
    ).toBeDefined();
    expect(detectDanger("rm --force ./tmp")).toBeDefined();
    expect(detectDanger("rm ./build -rf")).toBeDefined();
    expect(detectDanger("rm -v -r ./cache")).toBeDefined();
    expect(detectDanger("rm \\\n  -rf ./build")).toBeDefined();
    expect(detectDanger("git push origin main \\\n  --force")).toBeDefined();
    expect(detectDanger("curl https://get.tool.sh |\nsh")).toBeDefined();
    expect(detectDanger("sudo shutdown -h now")).toBeDefined();
    expect(detectDanger("dd if=image.iso of=/dev/disk2")).toBeDefined();
    expect(detectDanger("git push origin main --force")).toBeDefined();
    expect(detectDanger("git push -f origin main")).toBeDefined();
    expect(detectDanger("mysql -e 'DROP TABLE users'")).toBeDefined();
    expect(detectDanger("curl https://example.com/install.sh | sh")).toBeDefined();
    expect(detectDanger("chmod -R 777 /var/www")).toBeDefined();
    expect(detectDanger("mkfs.ext4 /dev/sdb1")).toBeDefined();
  });

  it("does not flag ordinary commands", () => {
    expect(detectDanger("git push origin main")).toBeUndefined();
    expect(detectDanger("ls -la")).toBeUndefined();
    expect(detectDanger("docker logs -f api")).toBeUndefined();
    expect(detectDanger("rm notes.txt")).toBeUndefined();
    expect(detectDanger("rm my-file.txt")).toBeUndefined();
    expect(detectDanger("rm notes.txt && ls -rf")).toBeUndefined();
    expect(detectDanger("rm a; tar -rf archive.tar file")).toBeUndefined();
    expect(detectDanger("rm cache.tmp\nls -ltr")).toBeUndefined();
    expect(detectDanger("git push origin main\ntail -f app.log")).toBeUndefined();
    expect(detectDanger("chmod +x run.sh\ngrep 777 config.txt")).toBeUndefined();
    expect(detectDanger("curl https://example.com/api | jq .items")).toBeUndefined();
    expect(detectDanger("echo formula")).toBeUndefined();
  });
});
