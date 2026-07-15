export interface Preferences {
  odooUrl: string;
  apiKey: string;
  database: string;
  userLogin: string;
}

export interface OdooResponse<T = unknown> {
  result?: T;
  error?: {
    message: string;
    data?: {
      name: string;
      message: string;
    };
  };
}

export interface Project {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  user_id?: [number, string]; // Responsable du projet
  partner_id?: [number, string]; // Client/Partenaire
  stage_id?: [number, string]; // Étape du projet
  task_count?: number;
  active?: boolean; // Projet actif ou non
  company_id?: [number, string]; // Société
  date_start?: string; // Date de début
  date?: string; // Date de fin
}

export interface HelpdeskTeam {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  member_ids?: number[]; // Team members
  use_helpdesk_timesheet?: boolean;
  use_helpdesk_sale_timesheet?: boolean;
  ticket_count?: number;
  stage_ids?: number[]; // Stages disponibles pour cette équipe
  company_id?: [number, string]; // Société
  active?: boolean; // Équipe active ou non
}

export interface OdooSearchOptions {
  fields: string[];
  domain?: unknown[];
  limit?: number;
}
