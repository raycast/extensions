```fortran
subroutine chpgst (
        integer itype,
        character uplo,
        integer n,
        complex, dimension( * ) ap,
        complex, dimension( * ) bp,
        integer info
)
```

CHPGST reduces a complex Hermitian-definite generalized
eigenproblem to standard form, using packed storage.

If ITYPE = 1, the problem is A\*x = lambda\*B\*x,
and A is overwritten by inv(U\*\*H)\*A\*inv(U) or inv(L)\*A\*inv(L\*\*H)

If ITYPE = 2 or 3, the problem is A\*B\*x = lambda\*x or
B\*A\*x = lambda\*x, and A is overwritten by U\*A\*U\*\*H or L\*\*H\*A\*L.

B must have been previously factorized as U\*\*H\*U or L\*L\*\*H by CPPTRF.

## Parameters
ITYPE : INTEGER [in]
> = 1: compute inv(U\*\*H)\*A\*inv(U) or inv(L)\*A\*inv(L\*\*H);
> = 2 or 3: compute U\*A\*U\*\*H or L\*\*H\*A\*L.

UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored and B is factored as
> U\*\*H\*U;
> = 'L':  Lower triangle of A is stored and B is factored as
> L\*L\*\*H.

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

AP : COMPLEX array, dimension (N\*(N+1)/2) [in,out]
> On entry, the upper or lower triangle of the Hermitian matrix
> A, packed columnwise in a linear array.  The j-th column of A
> is stored in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> 
> On exit, if INFO = 0, the transformed matrix, stored in the
> same format as A.

BP : COMPLEX array, dimension (N\*(N+1)/2) [in]
> The triangular factor from the Cholesky factorization of B,
> stored in the same format as A, as returned by CPPTRF.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
