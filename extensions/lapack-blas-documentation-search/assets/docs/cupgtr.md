```fortran
subroutine cupgtr (
        character uplo,
        integer n,
        complex, dimension( * ) ap,
        complex, dimension( * ) tau,
        complex, dimension( ldq, * ) q,
        integer ldq,
        complex, dimension( * ) work,
        integer info
)
```

CUPGTR generates a complex unitary matrix Q which is defined as the
product of n-1 elementary reflectors H(i) of order n, as returned by
CHPTRD using packed storage:

if UPLO = 'U', Q = H(n-1) . . . H(2) H(1),

if UPLO = 'L', Q = H(1) H(2) . . . H(n-1).

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U': Upper triangular packed storage used in previous
> call to CHPTRD;
> = 'L': Lower triangular packed storage used in previous
> call to CHPTRD.

N : INTEGER [in]
> The order of the matrix Q. N >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in]
> The vectors which define the elementary reflectors, as
> returned by CHPTRD.

TAU : COMPLEX array, dimension (N-1) [in]
> TAU(i) must contain the scalar factor of the elementary
> reflector H(i), as returned by CHPTRD.

Q : COMPLEX array, dimension (LDQ,N) [out]
> The N-by-N unitary matrix Q.

LDQ : INTEGER [in]
> The leading dimension of the array Q. LDQ >= max(1,N).

WORK : COMPLEX array, dimension (N-1) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
