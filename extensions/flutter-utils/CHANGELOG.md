# Flutter Utils Changelog

## [0.1.0] - 2025-09-23

- Ajout des commandes: Flutter Run, Flutter Pub Get, Flutter Clean
- Ajout préférence `Project Path`
- Documentation mise à jour

## [0.2.0] - 2025-09-23

- Ajout de la commande unifiée "Flutter" listant les actions et supportant des arguments
- Version bump 0.2.0

## [0.2.1] - 2025-09-23

- Ajout de la préférence "Terminal" (Warp par défaut)
- Support d'exécution des commandes interactives dans Warp

## [0.2.2] - 2025-09-23

- Ajout de la préférence "Flutter SDK Path" et utilisation du binaire correspondant si défini

## [0.2.3] - 2025-09-23

- `flutter pub get` et `flutter clean` utilisent toujours `flutter ...` (le SDK Path n’est pas utilisé pour ces commandes)

## [0.2.4] - 2025-09-23

- Ajout de la préférence "Verbose Logs" et d'un logger interne (console développeur Raycast)
- Logs sur: résolution du projet, terminal choisi, commandes exécutées, SDK détecté

## [0.2.5] - 2025-09-23

- Injection du Flutter SDK dans PATH pour les commandes background (fix "flutter not found")

## [0.3.0] - 2025-09-23

- Ajout d’une UI de progression (Detail) avec logs en direct pour Run / Pub Get / Clean
- Correction de PATH dans la vue de progression (ajout du SDK bin si défini)

## [0.3.1] - 2025-09-23

- Suppression des préférences "Terminal" et "Verbose Logs" (Warp imposé, logs UI intégrés)

## [0.3.2] - 2025-09-23

- Seule la commande unifiée "Flutter" apparaît dans Raycast (Run/Clean/Pub Get depuis l’UI)

## [0.3.3] - 2025-09-23

- Progression: n'affiche plus "Erreur" au lancement; l'état final est déterminé par le code de sortie

## [0.4.0] - 2025-09-24

- Ajout de nouvelles actions dans la commande unifiée: `analyze`, `test`, `build apk`, `build appbundle`, `build ios`, `doctor`
- Formulaire d'arguments désormais disponible pour toutes les actions (run/analyze/test/build/doctor)
- Description mise à jour et version bump 0.4.0

## [0.4.1] - 2025-09-24

- Logs modernisés avec mise en évidence type diff (succès/avertissements/erreurs/étapes)
- Correction de la duplication des logs via cleanup des écouteurs et kill du process à la fermeture
- Récupération des devices plus robuste (parsing des sorties non JSON)

## [0.4.2] - 2025-09-24

- Filtrage des lignes d’aide interactives de `flutter run` dans les logs UI (ex: "Flutter run key commands.", "h List all available interactive commands.", "c Clear the screen", "q Quit (terminate the application on the device).")

## [0.4.3] - 2025-09-24

- Ajout d'une option "Ouvrir dans Warp (mode interactif: h/c/q)" pour `flutter run` permettant d'utiliser les commandes interactives dans un vrai terminal

## [0.4.4] - 2025-09-24

- Amélioration de l'ouverture Warp (nouvel onglet/retards) et repli automatique vers Terminal.app si Warp échoue
- Message de confirmation indiquant le terminal utilisé

## [0.4.5] - 2025-09-24

- `Run` s'ouvre désormais toujours dans Warp (mode interactif obligatoire), suppression de l'option de bascule

## [0.4.6] - 2025-09-24

- Ouverture Warp fiabilisée: nouvelle fenêtre systématique, délais accrus, attente explicite de la fenêtre

## [0.4.7] - 2025-09-24

- Script Warp simplifié (activate + Cmd+N + run) pour correspondre au comportement testé manuellement

## [0.4.8] - 2025-09-24

- Ouverture Warp plus fiable: commande copiée dans le presse‑papiers puis collée (Cmd+V), délais ajustés

## [0.4.9] - 2025-09-24

- Exécution automatique dans Warp: commande avec saut de ligne, double Entrée envoyé pour assurer le lancement

## [0.4.10] - 2025-09-24

- Collage + validations plus robustes: focus fenêtre, keystroke return + key code 36 avec délais étendus

## [0.4.11] - 2025-09-24

- Exécution Warp durcie: envoie successif de Return, key code 36, Enter (numpad 76) et Ctrl+M pour forcer le lancement même en mode bracketed paste
 
## [0.4.12] - 2025-09-24

- Documentation interne améliorée (docstrings) pour les fonctions, méthodes et attributs
- Préparation à la publication: README complété et métadonnées vérifiées