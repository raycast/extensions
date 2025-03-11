import { Clipboard, showToast } from '@raycast/api';
import { generatePassword } from './lib/password-generator';
import { showFailureToast } from '@raycast/utils';

export default async function Command() {
  try {
    // Génère un mot de passe de 24 caractères
    const password = generatePassword(24);

    // Copie le mot de passe dans le presse-papier
    await Clipboard.copy(password);

    // Affiche un message de confirmation
    await showToast({ title: 'Un nouveau mot de passe a été généré' });
  } catch (error) {
    await showFailureToast(error, { title: 'Erreur lors de la génération du mot de passe' });
    console.error(error);
  }
}
