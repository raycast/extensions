// ─── Translation interface ────────────────────────────────────────────────────

interface Translations {
  // Search / List
  search_contacts_placeholder: string;
  loading_contacts: string;
  no_contacts_found: string;
  no_contacts_description: string;

  // Metadata labels
  label_phone: string;
  label_email: string;
  label_address: string;
  label_birthday: string;
  label_notes: string;

  // Job subtitle connector ("Software Engineer at Google")
  subtitle_at: string;

  // Primary actions
  action_compose_email: string;
  action_call: string;
  action_open_in_contacts: string;
  action_open_in_maps: string;
  action_new_contact: string;
  action_refresh: string;
  action_open_contacts_app: string;

  // Copy section
  section_copy: string;
  action_copy_name: string;
  copy_phone: string;
  copy_phone_labeled: string; // uses {label} placeholder
  copy_email: string;
  copy_email_labeled: string; // uses {label} placeholder

  // Edit / manage actions
  action_edit_contact: string;
  action_refresh_contacts: string;
  action_delete_contact: string;

  // Delete confirmation dialog
  confirm_delete_title: string;
  confirm_delete_message: string; // uses {name} placeholder
  confirm_delete_button: string;

  // Toasts — delete
  toast_contact_deleted: string;
  toast_failed_delete_contact: string;

  // Toasts — form validation / save
  toast_name_required: string;
  toast_name_required_message: string;
  toast_saving_contact: string;
  toast_creating_contact: string;
  toast_contact_updated: string;
  toast_contact_created: string;
  toast_failed_update_contact: string;
  toast_failed_create_contact: string;

  // Toasts — list load
  toast_failed_load_contacts: string;

  // Form navigation titles
  form_title_edit: string; // uses {name} placeholder
  form_title_new: string;
  contact_singular: string; // fallback when contact name is absent

  // Form submit actions
  action_save_contact: string;
  action_create_contact: string;

  // Form field labels & placeholders
  field_first_name: string;
  placeholder_first_name: string;
  field_last_name: string;
  placeholder_last_name: string;
  field_company: string;
  placeholder_company: string;
  field_job_title: string;
  placeholder_job_title: string;
  field_phone: string;
  placeholder_phone: string;
  field_email: string;
  placeholder_email: string;
  field_notes: string;
  placeholder_notes: string;
}

export type TranslationKey = keyof Translations;

// ─── English (base / fallback) ────────────────────────────────────────────────

const en: Translations = {
  search_contacts_placeholder: "Search contacts…",
  loading_contacts: "Loading Contacts…",
  no_contacts_found: "No Contacts Found",
  no_contacts_description:
    "Try a different search, or press ⌘O to open the Contacts app.",

  label_phone: "Phone",
  label_email: "Email",
  label_address: "Address",
  label_birthday: "Birthday",
  label_notes: "Notes",

  subtitle_at: " at ",

  action_compose_email: "Compose Email",
  action_call: "Call",
  action_open_in_contacts: "Open in Contacts",
  action_open_in_maps: "Open in Maps",
  action_new_contact: "New Contact",
  action_refresh: "Refresh",
  action_open_contacts_app: "Open Contacts App",

  section_copy: "Copy",
  action_copy_name: "Copy Name",
  copy_phone: "Copy Phone",
  copy_phone_labeled: "Copy {label} Phone",
  copy_email: "Copy Email",
  copy_email_labeled: "Copy {label} Email",

  action_edit_contact: "Edit Contact",
  action_refresh_contacts: "Refresh Contacts",
  action_delete_contact: "Delete Contact",

  confirm_delete_title: "Delete Contact",
  confirm_delete_message: `Are you sure you want to delete "{name}"? This cannot be undone.`,
  confirm_delete_button: "Delete",

  toast_contact_deleted: "Contact deleted",
  toast_failed_delete_contact: "Failed to delete contact",

  toast_name_required: "Name required",
  toast_name_required_message: "Please enter at least a first or last name.",
  toast_saving_contact: "Saving contact…",
  toast_creating_contact: "Creating contact…",
  toast_contact_updated: "Contact updated",
  toast_contact_created: "Contact created",
  toast_failed_update_contact: "Failed to update contact",
  toast_failed_create_contact: "Failed to create contact",

  toast_failed_load_contacts: "Failed to load Apple Contacts",

  form_title_edit: "Edit {name}",
  form_title_new: "New Contact",
  contact_singular: "Contact",

  action_save_contact: "Save Contact",
  action_create_contact: "Create Contact",

  field_first_name: "First Name",
  placeholder_first_name: "First",
  field_last_name: "Last Name",
  placeholder_last_name: "Last",
  field_company: "Company",
  placeholder_company: "Acme Corp",
  field_job_title: "Job Title",
  placeholder_job_title: "Engineer",
  field_phone: "Phone",
  placeholder_phone: "+1 (555) 000-0000",
  field_email: "Email",
  placeholder_email: "name@example.com",
  field_notes: "Notes",
  placeholder_notes: "Notes…",
};

// ─── French — France ──────────────────────────────────────────────────────────

const fr: Partial<Translations> = {
  search_contacts_placeholder: "Rechercher des contacts…",
  loading_contacts: "Chargement des contacts…",
  no_contacts_found: "Aucun contact trouvé",
  no_contacts_description:
    "Essayez une autre recherche ou appuyez sur ⌘O pour ouvrir l'app Contacts.",

  label_phone: "Téléphone",
  label_email: "E-mail",
  label_address: "Adresse",
  label_birthday: "Anniversaire",
  label_notes: "Notes",

  subtitle_at: " chez ",

  action_compose_email: "Envoyer un e-mail",
  action_call: "Appeler",
  action_open_in_contacts: "Ouvrir dans Contacts",
  action_open_in_maps: "Ouvrir dans Plans",
  action_new_contact: "Nouveau contact",
  action_refresh: "Actualiser",
  action_open_contacts_app: "Ouvrir l'app Contacts",

  section_copy: "Copier",
  action_copy_name: "Copier le nom",
  copy_phone: "Copier le téléphone",
  copy_phone_labeled: "Copier le téléphone {label}",
  copy_email: "Copier l'e-mail",
  copy_email_labeled: "Copier l'e-mail {label}",

  action_edit_contact: "Modifier le contact",
  action_refresh_contacts: "Actualiser les contacts",
  action_delete_contact: "Supprimer le contact",

  confirm_delete_title: "Supprimer le contact",
  confirm_delete_message: `Êtes-vous sûr de vouloir supprimer « {name} » ? Cette action est irréversible.`,
  confirm_delete_button: "Supprimer",

  toast_contact_deleted: "Contact supprimé",
  toast_failed_delete_contact: "Impossible de supprimer le contact",

  toast_name_required: "Nom requis",
  toast_name_required_message: "Veuillez saisir au moins un prénom ou un nom.",
  toast_saving_contact: "Enregistrement du contact…",
  toast_creating_contact: "Création du contact…",
  toast_contact_updated: "Contact mis à jour",
  toast_contact_created: "Contact créé",
  toast_failed_update_contact: "Impossible de mettre à jour le contact",
  toast_failed_create_contact: "Impossible de créer le contact",

  toast_failed_load_contacts: "Impossible de charger les contacts Apple",

  form_title_edit: "Modifier {name}",
  form_title_new: "Nouveau contact",
  contact_singular: "Contact",

  action_save_contact: "Enregistrer le contact",
  action_create_contact: "Créer le contact",

  field_first_name: "Prénom",
  placeholder_first_name: "Prénom",
  field_last_name: "Nom",
  placeholder_last_name: "Nom",
  field_company: "Entreprise",
  placeholder_company: "Acme Corp",
  field_job_title: "Intitulé du poste",
  placeholder_job_title: "Ingénieur",
  field_phone: "Téléphone",
  placeholder_phone: "+33 6 00 00 00 00",
  field_email: "E-mail",
  placeholder_email: "prenom@exemple.fr",
  field_notes: "Notes",
  placeholder_notes: "Notes…",
};

// ─── French — Canada (overrides only; falls back to fr, then en) ──────────────
// Quebec French uses "courriel" instead of "e-mail" and North American phone formats.

const frCA: Partial<Translations> = {
  label_email: "Courriel",

  action_compose_email: "Envoyer un courriel",

  copy_email: "Copier le courriel",
  copy_email_labeled: "Copier le courriel {label}",

  field_email: "Courriel",
  placeholder_phone: "+1 (555) 000-0000",
  placeholder_email: "prenom@exemple.ca",
};

// ─── German ───────────────────────────────────────────────────────────────────

const de: Partial<Translations> = {
  search_contacts_placeholder: "Kontakte durchsuchen…",
  loading_contacts: "Kontakte werden geladen…",
  no_contacts_found: "Keine Kontakte gefunden",
  no_contacts_description:
    "Versuchen Sie eine andere Suche oder drücken Sie ⌘O, um die Kontakte-App zu öffnen.",

  label_phone: "Telefon",
  label_email: "E-Mail",
  label_address: "Adresse",
  label_birthday: "Geburtstag",
  label_notes: "Notizen",

  subtitle_at: " bei ",

  action_compose_email: "E-Mail senden",
  action_call: "Anrufen",
  action_open_in_contacts: "In Kontakten öffnen",
  action_open_in_maps: "In Karten öffnen",
  action_new_contact: "Neuer Kontakt",
  action_refresh: "Aktualisieren",
  action_open_contacts_app: "Kontakte-App öffnen",

  section_copy: "Kopieren",
  action_copy_name: "Name kopieren",
  copy_phone: "Telefonnummer kopieren",
  copy_phone_labeled: "{label} Telefonnummer kopieren",
  copy_email: "E-Mail-Adresse kopieren",
  copy_email_labeled: "{label} E-Mail-Adresse kopieren",

  action_edit_contact: "Kontakt bearbeiten",
  action_refresh_contacts: "Kontakte aktualisieren",
  action_delete_contact: "Kontakt löschen",

  confirm_delete_title: "Kontakt löschen",
  confirm_delete_message: `Möchten Sie „{name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
  confirm_delete_button: "Löschen",

  toast_contact_deleted: "Kontakt gelöscht",
  toast_failed_delete_contact: "Kontakt konnte nicht gelöscht werden",

  toast_name_required: "Name erforderlich",
  toast_name_required_message:
    "Bitte geben Sie mindestens einen Vor- oder Nachnamen ein.",
  toast_saving_contact: "Kontakt wird gespeichert…",
  toast_creating_contact: "Kontakt wird erstellt…",
  toast_contact_updated: "Kontakt aktualisiert",
  toast_contact_created: "Kontakt erstellt",
  toast_failed_update_contact: "Kontakt konnte nicht aktualisiert werden",
  toast_failed_create_contact: "Kontakt konnte nicht erstellt werden",

  toast_failed_load_contacts: "Apple-Kontakte konnten nicht geladen werden",

  form_title_edit: "{name} bearbeiten",
  form_title_new: "Neuer Kontakt",
  contact_singular: "Kontakt",

  action_save_contact: "Kontakt speichern",
  action_create_contact: "Kontakt erstellen",

  field_first_name: "Vorname",
  placeholder_first_name: "Vorname",
  field_last_name: "Nachname",
  placeholder_last_name: "Nachname",
  field_company: "Unternehmen",
  placeholder_company: "Acme Corp",
  field_job_title: "Berufsbezeichnung",
  placeholder_job_title: "Ingenieur",
  field_phone: "Telefon",
  placeholder_phone: "+49 000 000000",
  field_email: "E-Mail",
  placeholder_email: "name@beispiel.de",
  field_notes: "Notizen",
  placeholder_notes: "Notizen…",
};

// ─── Spanish ──────────────────────────────────────────────────────────────────

const es: Partial<Translations> = {
  search_contacts_placeholder: "Buscar contactos…",
  loading_contacts: "Cargando contactos…",
  no_contacts_found: "No se encontraron contactos",
  no_contacts_description:
    "Intenta una búsqueda diferente o pulsa ⌘O para abrir la app Contactos.",

  label_phone: "Teléfono",
  label_email: "Correo electrónico",
  label_address: "Dirección",
  label_birthday: "Cumpleaños",
  label_notes: "Notas",

  subtitle_at: " en ",

  action_compose_email: "Enviar correo",
  action_call: "Llamar",
  action_open_in_contacts: "Abrir en Contactos",
  action_open_in_maps: "Abrir en Mapas",
  action_new_contact: "Nuevo contacto",
  action_refresh: "Actualizar",
  action_open_contacts_app: "Abrir app Contactos",

  section_copy: "Copiar",
  action_copy_name: "Copiar nombre",
  copy_phone: "Copiar teléfono",
  copy_phone_labeled: "Copiar teléfono {label}",
  copy_email: "Copiar correo electrónico",
  copy_email_labeled: "Copiar correo electrónico {label}",

  action_edit_contact: "Editar contacto",
  action_refresh_contacts: "Actualizar contactos",
  action_delete_contact: "Eliminar contacto",

  confirm_delete_title: "Eliminar contacto",
  confirm_delete_message: `¿Estás seguro de que quieres eliminar «{name}»? Esta acción no se puede deshacer.`,
  confirm_delete_button: "Eliminar",

  toast_contact_deleted: "Contacto eliminado",
  toast_failed_delete_contact: "No se pudo eliminar el contacto",

  toast_name_required: "Nombre requerido",
  toast_name_required_message:
    "Por favor, introduce al menos un nombre o apellido.",
  toast_saving_contact: "Guardando contacto…",
  toast_creating_contact: "Creando contacto…",
  toast_contact_updated: "Contacto actualizado",
  toast_contact_created: "Contacto creado",
  toast_failed_update_contact: "No se pudo actualizar el contacto",
  toast_failed_create_contact: "No se pudo crear el contacto",

  toast_failed_load_contacts: "No se pudieron cargar los contactos de Apple",

  form_title_edit: "Editar {name}",
  form_title_new: "Nuevo contacto",
  contact_singular: "Contacto",

  action_save_contact: "Guardar contacto",
  action_create_contact: "Crear contacto",

  field_first_name: "Nombre",
  placeholder_first_name: "Nombre",
  field_last_name: "Apellido",
  placeholder_last_name: "Apellido",
  field_company: "Empresa",
  placeholder_company: "Acme Corp",
  field_job_title: "Cargo",
  placeholder_job_title: "Ingeniero",
  field_phone: "Teléfono",
  placeholder_phone: "+34 000 000 000",
  field_email: "Correo electrónico",
  placeholder_email: "nombre@ejemplo.com",
  field_notes: "Notas",
  placeholder_notes: "Notas…",
};

// ─── Locale detection ─────────────────────────────────────────────────────────

function detectLocale(): string {
  // Intl gives clean BCP 47 tags like "fr-CA", "de", "en-US"
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale) return locale;
  } catch {
    // fall through
  }

  // Fallback: LANG env var like "fr_CA.UTF-8" → "fr-CA"
  const lang = (process.env.LANG ?? "").split(".")[0].replace("_", "-");
  return lang || "en";
}

// ─── Lookup chain builder ─────────────────────────────────────────────────────

function buildLookupChain(locale: string): Partial<Translations>[] {
  const lower = locale.toLowerCase();

  if (lower.startsWith("fr-ca") || lower === "fr-ca") {
    return [frCA, fr, en];
  }
  if (lower.startsWith("fr")) {
    return [fr, en];
  }
  if (lower.startsWith("de")) {
    return [de, en];
  }
  if (lower.startsWith("es")) {
    return [es, en];
  }
  // "en" or any other locale: use English only
  return [en];
}

// Module-level: detect once when the extension loads
const _lookupChain = buildLookupChain(detectLocale());

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the translated string for `key` in the system locale.
 * Falls back through the locale chain (e.g. fr-CA → fr → en).
 *
 * Supports `{placeholder}` interpolation via the optional `params` argument:
 *   t("confirm_delete_message", { name: contact.displayName })
 */
export function t(
  key: TranslationKey,
  params?: Record<string, string>,
): string {
  let str: string | undefined;

  for (const dict of _lookupChain) {
    const val = (dict as Record<string, string | undefined>)[key];
    if (val !== undefined) {
      str = val;
      break;
    }
  }

  // Safety net — should never happen when en has all keys
  str = str ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, v);
    }
  }

  return str;
}
