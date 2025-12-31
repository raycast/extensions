const { exec } = require("child_process");

// MOCK DATA for Write Test
const mockJobs = [
    {
        id: "123",
        name: "Test Job",
        schedule: "0 0 * * *",
        command: "echo 'hello'",
        status: "active"
    },
    {
        id: "456",
        name: "Paused Job",
        schedule: "*/5 * * * *",
        command: "echo 'paused'",
        status: "paused"
    }
];

const METADATA_PREFIX = "# RaycastID:";
const METADATA_REGEX = /# RaycastID:\s*(.+?)\s*\|\s*Name:\s*(.+?)\s*\|\s*Status:\s*(.+)/;

function serializeCrontab(jobs) {
    return jobs.map(job => {
        const metadata = `${METADATA_PREFIX} ${job.id} | Name: ${job.name} | Status: ${job.status}`;
        let line = `${job.schedule} ${job.command}`;

        if (job.status === 'paused') {
            line = `# ${line}`;
        }

        return `${metadata}\n${line}`;
    }).join("\n\n") + "\n";
}

function parseCrontab(content) {
    const lines = content.split("\n");
    const jobs = [];

    let pendingMetadata = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith(METADATA_PREFIX)) {
            const match = trimmed.match(METADATA_REGEX);
            if (match) {
                pendingMetadata = {
                    id: match[1],
                    name: match[2],
                    status: match[3]
                };
            }
            continue;
        }

        if (!trimmed.startsWith("#")) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 6) {
                const schedule = parts.slice(0, 5).join(" ");
                const command = parts.slice(5).join(" ");

                if (pendingMetadata) {
                    jobs.push({
                        id: pendingMetadata.id,
                        name: pendingMetadata.name,
                        schedule,
                        command,
                        status: pendingMetadata.status,
                        type: 'custom'
                    });
                    pendingMetadata = null;
                } else {
                    jobs.push({
                        id: "hash",
                        name: "Imported Job",
                        schedule,
                        command,
                        status: 'active',
                        type: 'custom'
                    });
                }
            }
        } else if (trimmed.startsWith("#") && pendingMetadata?.status === 'paused') {
            const actualLine = trimmed.substring(1).trim();
            const parts = actualLine.split(/\s+/);
            if (parts.length >= 6) {
                const schedule = parts.slice(0, 5).join(" ");
                const command = parts.slice(5).join(" ");
                jobs.push({
                    id: pendingMetadata.id,
                    name: pendingMetadata.name,
                    schedule,
                    command,
                    status: 'paused',
                    type: 'custom'
                });
                pendingMetadata = null;
            }
        }
    }

    return jobs;
}

// TEST 1: Serialize
console.log("--- TEST 1: Serialize ---");
const output = serializeCrontab(mockJobs);
console.log(output);

// TEST 2: Parse (Roundtrip)
console.log("\n--- TEST 2: Parse (Roundtrip) ---");
const parsed = parseCrontab(output);
console.log(parsed);

// TEST 3: Read Real System Crontab
console.log("\n--- TEST 3: Read System Crontab ---");
exec("crontab -l", (error, stdout, stderr) => {
    if (error) {
        console.log("No system crontab found or error:", error.message);
    } else {
        console.log("System Crontab Content:\n", stdout);
        const systemJobs = parseCrontab(stdout);
        console.log("Parsed System Jobs:", systemJobs);
    }
});
