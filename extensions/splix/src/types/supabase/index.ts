export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      noteContent: {
        Row: {
          content: Json;
          description: string;
          id: string;
          userId: string;
        };
        Insert: {
          content: Json;
          description: string;
          id: string;
          userId?: string;
        };
        Update: {
          content?: Json;
          description?: string;
          id?: string;
          userId?: string;
        };
        Relationships: [
          {
            foreignKeyName: "noteContent_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          createdAt: string;
          description: string;
          embedding: string;
          id: string;
          updatedAt: string;
          userId: string;
        };
        Insert: {
          createdAt?: string;
          description: string;
          embedding: string;
          id?: string;
          updatedAt?: string;
          userId?: string;
        };
        Update: {
          createdAt?: string;
          description?: string;
          embedding?: string;
          id?: string;
          updatedAt?: string;
          userId?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_userId_fkey";
            columns: ["userId"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatarUrl: string | null;
          email: string | null;
          fullName: string | null;
          id: string;
          updatedAt: string | null;
        };
        Insert: {
          avatarUrl?: string | null;
          email?: string | null;
          fullName?: string | null;
          id: string;
          updatedAt?: string | null;
        };
        Update: {
          avatarUrl?: string | null;
          email?: string | null;
          fullName?: string | null;
          id?: string;
          updatedAt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profilesIdFkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      userStats: {
        Row: {
          id: string;
          readCount: number;
          userId: string;
          writeCount: number;
        };
        Insert: {
          id?: string;
          readCount?: number;
          userId?: string;
          writeCount?: number;
        };
        Update: {
          id?: string;
          readCount?: number;
          userId?: string;
          writeCount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "userStats_userId_fkey";
            columns: ["userId"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hnswhandler: {
        Args: {
          "": unknown;
        };
        Returns: unknown;
      };
      insert_note: {
        Args: {
          embedding: string;
          content: Json;
          description: string;
        };
        Returns: string;
      };
      ivfflathandler: {
        Args: {
          "": unknown;
        };
        Returns: unknown;
      };
      match_notes: {
        Args: {
          embedding: string;
          match_threshold: number;
        };
        Returns: {
          id: string;
          userId: string;
          description: string;
          createdAt: string;
          updatedAt: string;
          content: Json;
        }[];
      };
      supabase_url: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      update_note: {
        Args: {
          note_id: string;
          new_embedding: string;
          new_content: Json;
          new_description: string;
        };
        Returns: undefined;
      };
      vector_avg: {
        Args: {
          "": number[];
        };
        Returns: string;
      };
      vector_dims: {
        Args: {
          "": string;
        };
        Returns: number;
      };
      vector_norm: {
        Args: {
          "": string;
        };
        Returns: number;
      };
      vector_out: {
        Args: {
          "": string;
        };
        Returns: unknown;
      };
      vector_send: {
        Args: {
          "": string;
        };
        Returns: string;
      };
      vector_typmod_in: {
        Args: {
          "": unknown[];
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    ? (Database["public"]["Tables"] & Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof Database["public"]["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never;
