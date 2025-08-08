# Recherche Entreprise (INPI) pour Raycast

> [!IMPORTANT]  
> Cette extension a été entièrement développée avec l'assistance de **Claude Code** et **Gemini CLI**, sans réelle compétence en code de la part de l'auteur. A utiliser à ses risques et périls.

Cette extension Raycast vous permet de rechercher rapidement les informations légales et financières d'une entreprise française en utilisant son numéro SIREN ou SIRET. Elle se connecte directement à l'API de l'INPI pour fournir des données à jour et fiables.

## 🚀 Installation

### Prérequis
- [Raycast](https://raycast.com) installé sur macOS
- Node.js 16+ et npm (pour le développement)
- Compte INPI avec accès API

### Installation depuis Raycast Store
*[Instructions à venir une fois l'extension publiée]*

### Installation pour développement
1. Clonez ce repository
```bash
git clone https://github.com/fma16/raycast-Company_autocomplete.git
cd raycast-Company_autocomplete
```

2. Installez les dépendances
```bash
npm install
```

3. Importez l'extension dans Raycast
```bash
npm run dev
```

## ⚙️ Configuration

### Obtenir les identifiants INPI

1. **Créer un compte INPI**
   - Rendez-vous sur [data.inpi.fr](https://data.inpi.fr/content/editorial/Acces_API_Entreprises)
   - Créez un compte si vous n'en avez pas
   - Connectez-vous à votre espace personnel

2. **Demander l'accès à l'API**
   - Dans votre espace personnel, naviguez vers la section API
   - Demandez l'accès à l'API du Registre National des Entreprises
   - Attendez l'approbation

3. **Récupérer vos identifiants**
   - Une fois l'accès approuvé, notez votre nom d'utilisateur (email) et mot de passe
   - Ces identifiants seront nécessaires pour configurer l'extension

### Configurer l'extension dans Raycast

1. Lancez Raycast et recherchez "Rechercher une entreprise"
2. Si c'est la première utilisation, Raycast ouvrira automatiquement les préférences
3. Renseignez vos identifiants INPI :
   - **Nom d'utilisateur INPI** : Votre email de connexion INPI
   - **Mot de passe INPI** : Votre mot de passe INPI

4. Les identifiants sont stockés de manière sécurisée par Raycast

## ✨ Fonctionnalités

- **Recherche par SIREN ou SIRET :** Entrez un numéro à 9 (SIREN) ou 14 chiffres (SIRET) pour obtenir les informations de l'entreprise
- **Informations complètes :** Dénomination sociale, forme juridique, capital social, date de création, adresse du siège
- **Ville du RCS fiabilisée :** Détermine automatiquement le greffe compétent basé sur le code postal
- **Représentant légal :** Identifie le représentant principal avec accord grammatical correct
- **Support des entrepreneurs individuels :** Gère aussi bien les personnes morales que physiques
- **Résumé formaté :** Texte prêt pour copier-coller dans vos documents juridiques
- **Limitation de débit intégrée :** Protection contre l'abus de l'API avec retry automatique

## Sources des Données

Cette extension s'appuie sur des sources de données ouvertes et officielles pour garantir la qualité des informations :

1.  **API INPI :** Les informations principales sur les entreprises (dénomination, capital, représentants, etc.) sont récupérées en temps réel via l'API officielle de l'**Institut National de la Propriété Industrielle (INPI)**.

2.  **Datainfogreffe :** Pour assurer l'exactitude de la ville d'immatriculation au RCS, l'extension utilise le jeu de données [Référentiel Communes - Greffes](https://opendata.datainfogreffe.fr/explore/assets/referentiel-communes-greffes/). Ce jeu de données est fourni par **Datainfogreffe** et est utilisé conformément à la **Licence Ouverte / Open Licence**.

## 🔧 Utilisation

1. **Ouvrir Raycast** et tapez "Rechercher une entreprise" ou utilisez le raccourci configuré
2. **Entrez le SIREN ou SIRET** de l'entreprise recherchée (9 ou 14 chiffres)
3. **Appuyez sur Entrée** pour lancer la recherche
4. **Consultez les résultats** dans l'interface Raycast
5. **Copiez le résumé** en appuyant sur `Cmd+C` ou via le bouton "Copy to Clipboard"

### Formats acceptés
- **SIREN** : 9 chiffres (ex: `123456789`)
- **SIRET** : 14 chiffres (ex: `12345678901234`) - seuls les 9 premiers chiffres (SIREN) seront utilisés

## 🛠️ Développement

### Structure du projet
```
src/
├── components/          # [Futur] Composants UI réutilisables
├── services/           # Logique métier et API
│   ├── inpi-api.ts     # Service API INPI
│   └── greffe-lookup.ts # Recherche de greffes
├── config/             # Configuration externe
│   └── role-mappings.json # Mapping des rôles
├── utils.ts            # Fonctions utilitaires
├── types.ts            # Définitions TypeScript
└── index.tsx           # Point d'entrée principal
```

### Commandes de développement
```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Build pour production
npm run build

# Linter et vérification des types
npm run lint
npm run typecheck

# Construire l'index des greffes (si nécessaire)
npx ts-node transform/build-greffes-index.ts
```

### Tests
```bash
# Lancer les tests unitaires
npm test

# Tests avec coverage
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

## 🔍 Dépannage

### Problèmes courants

#### "Authentication failed"
- ✅ Vérifiez vos identifiants INPI dans les préférences Raycast
- ✅ Assurez-vous que votre compte INPI a bien l'accès API
- ✅ Testez la connexion sur le site INPI directement
- ✅ Contactez le support INPI si le problème persiste

#### "Company not found"
- ✅ Vérifiez le format du SIREN/SIRET (9 ou 14 chiffres uniquement)
- ✅ Assurez-vous que l'entreprise existe et est active
- ✅ Certaines entreprises peuvent avoir des données incomplètes dans l'API

#### "Rate limit exceeded"
- ✅ Attendez quelques minutes avant de refaire des recherches
- ✅ L'extension limite automatiquement à 30 requêtes par minute
- ✅ Le retry automatique se chargera de relancer la requête

#### "Network error"
- ✅ Vérifiez votre connexion internet
- ✅ Vérifiez si le site INPI est accessible
- ✅ Redémarrez Raycast si nécessaire

### Support et débogage

#### Mode développement
En mode développement, l'extension log des informations supplémentaires dans la console :
```bash
# Voir les logs Raycast
tail -f ~/Library/Logs/Raycast/raycast.log
```

#### Signaler un problème
Si vous rencontrez un bug :
1. Activez le mode développement avec `npm run dev`
2. Reproduisez le problème
3. Consultez les logs de la console
4. Ouvrez une issue sur GitHub avec les détails

## 🤝 Contribution

Les contributions sont les bienvenues ! 

### Workflow de contribution
1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -m 'feat: ajouter nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

### Standards de code
- Utilisez TypeScript strict
- Suivez les conventions ESLint configurées
- Ajoutez des tests pour les nouvelles fonctionnalités
- Documentez les APIs publiques
- Utilisez les commits conventionnels

## 📝 Architecture technique

### Sécurité
- **Rate limiting** : 30 requêtes/minute avec backoff exponentiel
- **Validation des credentials** : Format email validé côté client
- **Pas de logging sensible** : Aucune donnée sensible n'est loggée en production
- **Stockage sécurisé** : Identifiants chiffrés par Raycast

### Performance
- **Lazy loading** : Chargement à la demande des configurations
- **Mise en cache** : Cache des mappings de rôles et greffes
- **Retry intelligent** : Retry automatique avec backoff exponentiel
- **Types stricts** : Élimination des erreurs runtime via TypeScript

### Fiabilité
- **Gestion d'erreurs robuste** : Messages d'erreur spécifiques et actionables
- **Fallbacks gracieux** : Valeurs par défaut pour les données manquantes  
- **Validation runtime** : Vérification de la structure des réponses API
