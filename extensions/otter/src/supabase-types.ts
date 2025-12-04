export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bookmark_tags: {
        Row: {
          bookmark_id: string
          tag_id: string
        }
        Insert: {
          bookmark_id: string
          tag_id: string
        }
        Update: {
          bookmark_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bookmark_tags_bookmark_id_fkey'
            columns: ['bookmark_id']
            isOneToOne: false
            referencedRelation: 'bookmarks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bookmark_tags_tag_id_fkey'
            columns: ['tag_id']
            isOneToOne: false
            referencedRelation: 'tags'
            referencedColumns: ['id']
          },
        ]
      }
      bookmarks: {
        Row: {
          click_count: number
          created_at: string
          description: string | null
          feed: string | null
          id: string
          image: string | null
          modified_at: string
          note: string | null
          public: boolean
          star: boolean
          status: Database['public']['Enums']['status']
          tags: string[] | null
          title: string | null
          tweet: Json | null
          type: Database['public']['Enums']['type'] | null
          url: string | null
          user: string | null
        }
        Insert: {
          click_count?: number
          created_at?: string
          description?: string | null
          feed?: string | null
          id?: string
          image?: string | null
          modified_at?: string
          note?: string | null
          public?: boolean
          star?: boolean
          status?: Database['public']['Enums']['status']
          tags?: string[] | null
          title?: string | null
          tweet?: Json | null
          type?: Database['public']['Enums']['type'] | null
          url?: string | null
          user?: string | null
        }
        Update: {
          click_count?: number
          created_at?: string
          description?: string | null
          feed?: string | null
          id?: string
          image?: string | null
          modified_at?: string
          note?: string | null
          public?: boolean
          star?: boolean
          status?: Database['public']['Enums']['status']
          tags?: string[] | null
          title?: string | null
          tweet?: Json | null
          type?: Database['public']['Enums']['type'] | null
          url?: string | null
          user?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          id: string
          settings_collections_visible: boolean
          settings_group_by_date: boolean | null
          settings_pinned_tags: string[]
          settings_tags_visible: boolean
          settings_top_tags_count: number | null
          settings_types_visible: boolean
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          id: string
          settings_collections_visible?: boolean
          settings_group_by_date?: boolean | null
          settings_pinned_tags?: string[]
          settings_tags_visible?: boolean
          settings_top_tags_count?: number | null
          settings_types_visible?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string
          settings_collections_visible?: boolean
          settings_group_by_date?: boolean | null
          settings_pinned_tags?: string[]
          settings_tags_visible?: boolean
          settings_top_tags_count?: number | null
          settings_types_visible?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          tag: string
        }
        Insert: {
          id?: string
          tag: string
        }
        Update: {
          id?: string
          tag?: string
        }
        Relationships: []
      }
      toots: {
        Row: {
          created_at: string | null
          db_user_id: string | null
          hashtags: string[] | null
          id: string
          liked_toot: boolean
          media: Json | null
          reply: Json | null
          text: string | null
          toot_id: string | null
          toot_url: string | null
          urls: Json | null
          user_avatar: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          db_user_id?: string | null
          hashtags?: string[] | null
          id?: string
          liked_toot?: boolean
          media?: Json | null
          reply?: Json | null
          text?: string | null
          toot_id?: string | null
          toot_url?: string | null
          urls?: Json | null
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          db_user_id?: string | null
          hashtags?: string[] | null
          id?: string
          liked_toot?: boolean
          media?: Json | null
          reply?: Json | null
          text?: string | null
          toot_id?: string | null
          toot_url?: string | null
          urls?: Json | null
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      tweets: {
        Row: {
          created_at: string | null
          db_user_id: string | null
          hashtags: string[] | null
          id: string
          liked_tweet: boolean
          media: Json | null
          reply: Json | null
          text: string | null
          tweet_id: string | null
          tweet_url: string | null
          urls: Json | null
          user_avatar: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          db_user_id?: string | null
          hashtags?: string[] | null
          id?: string
          liked_tweet?: boolean
          media?: Json | null
          reply?: Json | null
          text?: string | null
          tweet_id?: string | null
          tweet_url?: string | null
          urls?: Json | null
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          db_user_id?: string | null
          hashtags?: string[] | null
          id?: string
          liked_tweet?: boolean
          media?: Json | null
          reply?: Json | null
          text?: string | null
          tweet_id?: string | null
          tweet_url?: string | null
          urls?: Json | null
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      collection_tags_view: {
        Row: {
          bookmark_count: number | null
          collection: string | null
          tags: string[] | null
        }
        Relationships: []
      }
      tags_count: {
        Row: {
          count: number | null
          tag: string | null
        }
        Relationships: []
      }
      tags_count1: {
        Row: {
          bookmark_count: number | null
          tag: string | null
        }
        Relationships: []
      }
      types_count: {
        Row: {
          count: number | null
          type: Database['public']['Enums']['type'] | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_url: {
        Args: {
          url_input: string
        }
        Returns: {
          click_count: number
          created_at: string
          description: string | null
          feed: string | null
          id: string
          image: string | null
          modified_at: string
          note: string | null
          public: boolean
          star: boolean
          status: Database['public']['Enums']['status']
          tags: string[] | null
          title: string | null
          tweet: Json | null
          type: Database['public']['Enums']['type'] | null
          url: string | null
          user: string | null
        }[]
      }
      get_bookmarks_by_collection: {
        Args: {
          collection_name: string
        }
        Returns: {
          click_count: number
          created_at: string
          description: string | null
          feed: string | null
          id: string
          image: string | null
          modified_at: string
          note: string | null
          public: boolean
          star: boolean
          status: Database['public']['Enums']['status']
          tags: string[] | null
          title: string | null
          tweet: Json | null
          type: Database['public']['Enums']['type'] | null
          url: string | null
          user: string | null
        }[]
      }
      update_bookmark_tags: {
        Args: {
          old_tag: string
          new_tag: string
          user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      status: 'active' | 'inactive'
      type:
        | 'link'
        | 'video'
        | 'audio'
        | 'recipe'
        | 'image'
        | 'document'
        | 'article'
        | 'game'
        | 'book'
        | 'event'
        | 'product'
        | 'note'
        | 'file'
        | 'place'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never
