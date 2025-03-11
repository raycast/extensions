import { Clipboard, showToast } from '@raycast/api';
import { generatePassword } from './lib/password-generator';
import { showFailureToast } from '@raycast/utils';

export default async function Command() {
  try {
    // Génère un mot de passe de 24 caractères
    const password = generatePassword(24);

    // Colle le mot de passe directement
    await Clipboard.paste(password);

    // Affiche un message de confirmation
    await showToast({ title: 'Un nouveau mot de passe a été généré et collé' });
  } catch (error) {
    await showFailureToast(error, { title: 'Erreur lors de la génération du mot de passe' });
    console.error(error);
  }
}
