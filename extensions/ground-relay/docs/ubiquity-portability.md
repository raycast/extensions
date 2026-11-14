# Ubiquity Portability Boundary

Ground Relay is useful without Ubiquity. Its packet format preserves enough explicit context for a future Ubiquity importer to inspect the packet without collapsing portability into admission.

## Candidate mapping

| Ground Relay field | Possible Ubiquity intake use | What it cannot become automatically |
|---|---|---|
| `situation` | Mirror/intake candidate | Runtime truth |
| `operativeIntent` | Pursuit-vector elicitation input | TELOS or commitment |
| `explicitRefusals` | Apophatic elicitation input | Doctrine or universal prohibition |
| `constraints` | Local constraint candidates | Invariants |
| `authorityBoundary` | Authority-geometry candidate | Authority grant |
| `scopeBoundary` | Intake perimeter candidate | Admission scope |
| `evidence` | Source-bearing receipt candidates | Verified receipts |
| `uncertainties` | Typed uncertainty candidates | Conformation |
| `nextMove` | Proposal candidate | Authorized action |
| correction lineage | Re-elicitation and drift context | Institutional memory |

## Import gate

A future importer must:

1. validate the packet against `schemas/ground-relay.packet.schema.json`;
2. preserve the original packet and lineage identifiers;
3. keep all mapped fields candidate-only;
4. verify sources and current runtime independently;
5. obtain the authority required by the destination lane;
6. append an import/admission receipt rather than rewriting the Ground Relay packet.

The importer is intentionally not implemented in v1.0. Compatibility means the packet can be inspected without semantic guesswork; it does not mean the carrier has entered Ubiquity.
