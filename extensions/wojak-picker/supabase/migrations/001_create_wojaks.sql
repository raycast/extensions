insert into storage.buckets (id, name, public)
values ('wojaks', 'wojaks', true)
on conflict (id) do update
set public = excluded.public;

create table if not exists public.wojaks (
  id text primary key,
  name text not null,
  category text not null,
  filename text not null,
  thumb_url text not null,
  full_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists wojaks_name_idx on public.wojaks (name);
create index if not exists wojaks_category_idx on public.wojaks (category);

alter table public.wojaks enable row level security;

drop policy if exists "Public read wojaks" on public.wojaks;
create policy "Public read wojaks"
on public.wojaks
for select
using (true);

drop policy if exists "Public read wojak images" on storage.objects;
create policy "Public read wojak images"
on storage.objects
for select
using (bucket_id = 'wojaks');
