# Creative Brief Check

Creative Brief Check is a local Raycast command for reviewing a visual-production brief before it moves into image generation, video generation, design, or a handoff to another team. It turns a loosely written request into a deterministic checklist and highlights missing constraints without sending the brief to an external service.

## What The Command Reviews

The form covers the information that most directly affects whether a visual request can be executed consistently:

- the primary goal of the asset;
- the intended audience;
- the subject and observable action;
- approved reference assets;
- camera or composition direction;
- target duration for motion work;
- delivery aspect ratio;
- negative constraints and details that must not change.

Goal, audience, subject/action, references, and aspect ratio are treated as required. Camera direction, duration, and negative constraints are recommendations because they depend on the kind of asset being produced. The result view shows a percentage score, separates missing required items from recommendations, and preserves the supplied brief as a compact summary.

## Why Use A Preflight Check

Generation and editing tools can respond to incomplete prompts, but an output is not necessarily useful just because it renders. A missing reference can change product geometry. An unspecified aspect ratio can create the wrong framing. A vague action can make motion difficult to evaluate. These failures are cheaper to catch before work starts than after several drafts have been reviewed.

The command intentionally does not judge artistic quality and does not claim that a complete brief guarantees a successful output. It only verifies whether the brief contains explicit production constraints. Brand approval, factual claim review, licensing, accessibility, and comparison with the real product remain separate review steps.

## Suggested Workflow

1. Open **Check Creative Brief** in Raycast.
2. Fill the known fields without inventing missing information.
3. Run the check and review required gaps first.
4. Return the brief to its owner when a required constraint is absent.
5. Use the completed brief in the production tool selected by the team.
6. Compare the result with approved references before publishing.

The command is tool-independent. A team exploring image drafts may use a separate browser workspace such as [Seedream 5.0 Pro AI Image Generator](https://seedream50.pro/) for text-to-image, image-to-image, sketch-guided, or reference-based concepts. That service is not integrated with this extension; the link is an optional example of where a completed brief could be used after review.

## Data And Privacy

All checks run in the Raycast extension process. The command does not make network requests, upload prompt text, store credentials, or write the brief to disk. Closing the result returns no data to an external endpoint.

## Limitations

The checklist is intentionally compact. It does not validate whether a reference file is licensed, whether a product claim is accurate, or whether generated media matches a physical object. It also does not replace a full creative operations system with approval states, version history, ownership, and audit logs. Treat the score as a prompt for review, not as an automated approval decision.
