```fortran
subroutine sopgtr (
        character uplo,
        integer n,
        real, dimension( * ) ap,
        real, dimension( * ) tau,
        real, dimension( ldq, * ) q,
        integer ldq,
        real, dimension( * ) work,
        integer info
)
```

SOPGTR generates a real orthogonal matrix Q which is defined as the
product of n-1 elementary reflectors H(i) of order n, as returned by
SSPTRD using packed storage:

if UPLO = 'U', Q = H(n-1) . . . H(2) H(1),

if UPLO = 'L', Q = H(1) H(2) . . . H(n-1).

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U': Upper triangular packed storage used in previous
> call to SSPTRD;
> = 'L': Lower triangular packed storage used in previous
> call to SSPTRD.

N : INTEGER [in]
> The order of the matrix Q. N >= 0.

AP : REAL array, dimension (N\*(N+1)/2) [in]
> The vectors which define the elementary reflectors, as
> returned by SSPTRD.

TAU : REAL array, dimension (N-1) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by SSPTRD.

Q : REAL array, dimension (LDQ,N) [out]
> The N-by-N orthogonal matrix Q.

LDQ : INTEGER [in]
> The leading dimension of the array Q. LDQ >= max(1,N).

WORK : REAL array, dimension (N-1) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
