import { ActionPanel, List, Action, Icon } from "@raycast/api";

interface Snippet {
  title: string;
  code: string;
  description: string;
  category: string;
}

const SNIPPETS: Snippet[] = [
  // Routes
  {
    title: "Basic Route",
    code: `Route::get('/welcome', function () {
    return view('welcome');
});`,
    description: "Define a basic GET route",
    category: "Routes",
  },
  {
    title: "Route with Controller",
    code: `Route::get('/users', [UserController::class, 'index']);`,
    description: "Route pointing to a controller method",
    category: "Routes",
  },
  {
    title: "Resource Route",
    code: `Route::resource('posts', PostController::class);`,
    description: "RESTful resource routes",
    category: "Routes",
  },
  {
    title: "API Resource Route",
    code: `Route::apiResource('posts', PostController::class);`,
    description: "API resource routes (no create/edit)",
    category: "Routes",
  },
  {
    title: "Route Group with Middleware",
    code: `Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/profile', [ProfileController::class, 'show']);
});`,
    description: "Group routes with middleware",
    category: "Routes",
  },
  {
    title: "Route with Parameters",
    code: `Route::get('/users/{id}', function (string $id) {
    return 'User ' . $id;
});`,
    description: "Route with URL parameters",
    category: "Routes",
  },

  // Controllers
  {
    title: "Controller Method",
    code: `public function index()
{
    $users = User::all();
    return view('users.index', compact('users'));
}`,
    description: "Basic controller method returning a view",
    category: "Controllers",
  },
  {
    title: "Store Method with Validation",
    code: `public function store(Request $request)
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|email|unique:users',
        'password' => 'required|min:8|confirmed',
    ]);

    $user = User::create($validated);

    return redirect()->route('users.show', $user);
}`,
    description: "Controller store method with validation",
    category: "Controllers",
  },
  {
    title: "API Response",
    code: `public function index()
{
    return response()->json([
        'data' => User::all(),
        'message' => 'Users retrieved successfully'
    ]);
}`,
    description: "Return JSON response in API controller",
    category: "Controllers",
  },

  // Models
  {
    title: "Model with Fillable",
    code: `class User extends Model
{
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];
}`,
    description: "Basic Eloquent model with fillable attributes",
    category: "Models",
  },
  {
    title: "HasMany Relationship",
    code: `public function posts(): HasMany
{
    return $this->hasMany(Post::class);
}`,
    description: "One-to-Many relationship",
    category: "Models",
  },
  {
    title: "BelongsTo Relationship",
    code: `public function user(): BelongsTo
{
    return $this->belongsTo(User::class);
}`,
    description: "Inverse One-to-Many relationship",
    category: "Models",
  },
  {
    title: "BelongsToMany Relationship",
    code: `public function roles(): BelongsToMany
{
    return $this->belongsToMany(Role::class);
}`,
    description: "Many-to-Many relationship",
    category: "Models",
  },
  {
    title: "Model Scope",
    code: `public function scopeActive(Builder $query): void
{
    $query->where('active', true);
}

// Usage: User::active()->get();`,
    description: "Local query scope",
    category: "Models",
  },
  {
    title: "Model Accessor",
    code: `protected function fullName(): Attribute
{
    return Attribute::make(
        get: fn () => "{$this->first_name} {$this->last_name}",
    );
}`,
    description: "Eloquent accessor (Laravel 9+)",
    category: "Models",
  },

  // Migrations
  {
    title: "Create Table Migration",
    code: `Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('body');
    $table->boolean('published')->default(false);
    $table->timestamps();
});`,
    description: "Create table with foreign key",
    category: "Migrations",
  },
  {
    title: "Add Column Migration",
    code: `Schema::table('users', function (Blueprint $table) {
    $table->string('phone')->nullable()->after('email');
});`,
    description: "Add column to existing table",
    category: "Migrations",
  },
  {
    title: "Drop Column Migration",
    code: `Schema::table('users', function (Blueprint $table) {
    $table->dropColumn('phone');
});`,
    description: "Remove column from table",
    category: "Migrations",
  },

  // Blade
  {
    title: "Blade Layout",
    code: `<!DOCTYPE html>
<html>
<head>
    <title>@yield('title')</title>
</head>
<body>
    @include('partials.nav')
    
    <main>
        @yield('content')
    </main>
</body>
</html>`,
    description: "Base Blade layout template",
    category: "Blade",
  },
  {
    title: "Blade Component",
    code: `<x-alert type="error" :message="$message" />`,
    description: "Use a Blade component",
    category: "Blade",
  },
  {
    title: "Blade Conditional",
    code: `@if ($user->isAdmin())
    <p>Welcome, Admin!</p>
@elseif ($user->isModerator())
    <p>Welcome, Moderator!</p>
@else
    <p>Welcome, User!</p>
@endif`,
    description: "If/else conditional in Blade",
    category: "Blade",
  },
  {
    title: "Blade Loop",
    code: `@foreach ($users as $user)
    <p>{{ $user->name }}</p>
@endforeach

@forelse ($users as $user)
    <p>{{ $user->name }}</p>
@empty
    <p>No users found.</p>
@endforelse`,
    description: "Loop through collection in Blade",
    category: "Blade",
  },

  // Validation
  {
    title: "Form Request",
    code: `public function rules(): array
{
    return [
        'title' => 'required|string|max:255',
        'body' => 'required|string',
        'published_at' => 'nullable|date',
        'tags' => 'array',
        'tags.*' => 'exists:tags,id',
    ];
}`,
    description: "Form request validation rules",
    category: "Validation",
  },
  {
    title: "Custom Validation Message",
    code: `public function messages(): array
{
    return [
        'title.required' => 'A title is required',
        'body.required' => 'Please provide content for your post',
    ];
}`,
    description: "Custom validation error messages",
    category: "Validation",
  },

  // Middleware
  {
    title: "Middleware Handle",
    code: `public function handle(Request $request, Closure $next): Response
{
    if (! $request->user()->isAdmin()) {
        abort(403);
    }

    return $next($request);
}`,
    description: "Basic middleware handle method",
    category: "Middleware",
  },

  // Testing
  {
    title: "Feature Test",
    code: `public function test_users_can_view_homepage(): void
{
    $response = $this->get('/');

    $response->assertStatus(200);
    $response->assertSee('Welcome');
}`,
    description: "Basic feature/HTTP test",
    category: "Testing",
  },
  {
    title: "Test with Authentication",
    code: `public function test_authenticated_user_can_create_post(): void
{
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->post('/posts', [
            'title' => 'My Post',
            'body' => 'Content here',
        ]);

    $response->assertRedirect('/posts');
    $this->assertDatabaseHas('posts', ['title' => 'My Post']);
}`,
    description: "Test with authenticated user",
    category: "Testing",
  },

  // Queries
  {
    title: "Eloquent Query",
    code: `$users = User::where('active', true)
    ->orderBy('created_at', 'desc')
    ->take(10)
    ->get();`,
    description: "Chained Eloquent query",
    category: "Queries",
  },
  {
    title: "Eager Loading",
    code: `$posts = Post::with(['user', 'comments.user'])
    ->where('published', true)
    ->get();`,
    description: "Eager load relationships",
    category: "Queries",
  },
  {
    title: "Query with Pagination",
    code: `$users = User::where('active', true)
    ->paginate(15);

// In Blade: {{ $users->links() }}`,
    description: "Paginate query results",
    category: "Queries",
  },
];

// Group snippets by category
function groupByCategory(snippets: Snippet[]): Record<string, Snippet[]> {
  return snippets.reduce(
    (acc, snippet) => {
      if (!acc[snippet.category]) {
        acc[snippet.category] = [];
      }
      acc[snippet.category].push(snippet);
      return acc;
    },
    {} as Record<string, Snippet[]>,
  );
}

export default function Command() {
  const grouped = groupByCategory(SNIPPETS);
  const categories = Object.keys(grouped);

  return (
    <List searchBarPlaceholder="Search Laravel snippets...">
      {categories.map((category) => (
        <List.Section key={category} title={category}>
          {grouped[category].map((snippet) => (
            <List.Item
              key={snippet.title}
              icon={Icon.Code}
              title={snippet.title}
              subtitle={snippet.description}
              accessories={[{ text: category }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard title="Copy Snippet" content={snippet.code} />
                    <Action.Paste title="Paste Snippet" content={snippet.code} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
