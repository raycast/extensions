# AGENTS.md

## Contexte du projet

Ce repository contient une extension Raycast nommee `BetaSeries`.

L'extension sert a gerer ses series, films et episodes via l'API BetaSeries depuis Raycast. Avant toute modification, considere donc ce projet comme une extension Raycast React/TypeScript, avec les contraintes de structure, de composants UI, de preferences, de manifest `package.json`, de commandes et de validation propres a Raycast.

## Regles de travail

- Suivre les conventions d'une extension Raycast pour toute correction, mise a jour ou nouvelle fonctionnalite.
- Preferer les composants et APIs officiels de `@raycast/api` et les helpers de `@raycast/utils` deja utilises par le projet.
- Garder les changements scopes et coherents avec les commandes existantes dans `src/`.
- Verifier les types et les contrats de l'API BetaSeries avant de changer les appels reseau ou les modeles de donnees.
- Ne pas inventer de comportement BetaSeries sans le confirmer dans la specification OpenAPI locale.
- Mettre a jour les messages, etats de chargement, erreurs et actions Raycast quand une fonctionnalite utilisateur change.

## Sources de reference

- Raycast API documentation: https://context7.com/websites/developers_raycast/llms.txt?tokens=10000
- Guide API BetaSeries: [`openapi.json`](openapi.json)

## Commandes utiles

- `npm run lint` : verifier les regles Raycast et TypeScript.
- `npm run build` : construire l'extension Raycast.
- `npm run dev` : lancer l'extension en developpement dans Raycast.

## Notes pour les agents

Quand tu travailles sur ce projet, commence par identifier la commande Raycast concernee dans `package.json`, puis lis le ou les fichiers correspondants dans `src/`. Pour les changements d'API, consulte `openapi.json` avant d'editer le code. Pour les changements d'interface, verifie la documentation Raycast et respecte les patterns natifs de Raycast plutot que de creer des abstractions UI maison.
