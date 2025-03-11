import crypto from 'crypto';

/**
 * Génère un mot de passe aléatoire avec des caractères alphanumériques
 * @param length Longueur du mot de passe (par défaut 24)
 * @returns Le mot de passe généré
 */
export function generatePassword(length = 24): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = crypto.randomBytes(length);
  let result = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % characters.length;
    result += characters.charAt(randomIndex);
  }

  return result;
}
