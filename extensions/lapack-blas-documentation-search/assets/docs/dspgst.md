```fortran
subroutine dspgst (
        integer itype,
        character uplo,
        integer n,
        double precision, dimension( * ) ap,
        double precision, dimension( * ) bp,
        integer info
)
```

DSPGST reduces a real symmetric-definite generalized eigenproblem
to standard form, using packed storage.

If ITYPE = 1, the problem is A\*x = lambda\*B\*x,
and A is overwritten by inv(U\*\*T)\*A\*inv(U) or inv(L)\*A\*inv(L\*\*T)

If ITYPE = 2 or 3, the problem is A\*B\*x = lambda\*x or
B\*A\*x = lambda\*x, and A is overwritten by U\*A\*U\*\*T or L\*\*T\*A\*L.

B must have been previously factorized as U\*\*T\*U or L\*L\*\*T by DPPTRF.

## Parameters
ITYPE : INTEGER [in]
> = 1: compute inv(U\*\*T)\*A\*inv(U) or inv(L)\*A\*inv(L\*\*T);
> = 2 or 3: compute U\*A\*U\*\*T or L\*\*T\*A\*L.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored and B is factored as
> U\*\*T\*U;
> = 'L':  Lower triangle of A is stored and B is factored as
> L\*L\*\*T.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

AP : DOUBLE PRECISION array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the symmetric matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> 
> On exit, if INFO = 0, the transformed matrix, stored in the
> same format as A.

BP : DOUBLE PRECISION array, dimension (N\*(N+1)/2) [in]
> The triangular factor from the Cholesky factorization of B,
> stored in the same format as A, as returned by DPPTRF.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
