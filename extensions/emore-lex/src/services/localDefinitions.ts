const LOCAL_DEFINITIONS: Record<string, string[]> = {
  denied: ["refused", "rejected", "not allowed", "blocked from access"],
  deny: ["to say something is not true", "to refuse to allow", "to refuse to give"],
  maintain: ["to keep working", "to preserve", "to support over time"],
  composure: ["calmness", "self-control", "steady behavior under pressure"],
  provision: ["to prepare resources", "to supply", "a condition or clause"],
  throughput: ["processing rate", "amount handled per unit of time"],
  latency: ["delay", "response time", "time before a result is returned"],
  resilience: ["ability to recover", "fault tolerance", "stability under failure"],
  deprecated: ["no longer recommended", "kept temporarily but expected to be removed"],
  permission: ["authorization", "allowed access"],
  access: ["entry", "permission", "ability to reach a resource"],
  refuse: ["to decline", "to reject"],
  reject: ["to refuse", "to dismiss", "to deny acceptance"],
  decline: ["to decrease", "to politely refuse"],
};

export function getLocalDefinitions(query: string): string[] {
  const normalizedQuery = query.trim().toLowerCase();
  return (
    LOCAL_DEFINITIONS[normalizedQuery] ?? [
      "No local usage note is available. Use the English definitions as the primary source.",
    ]
  );
}
