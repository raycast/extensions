```fortran
subroutine dsygs2 (
        integer itype,
        character uplo,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        integer info
)
```

DSYGS2 reduces a real symmetric-definite generalized eigenproblem
to standard form.

If ITYPE = 1, the problem is A\*x = lambda\*B\*x,
and A is overwritten by inv(U\*\*T)\*A\*inv(U) or inv(L)\*A\*inv(L\*\*T)

If ITYPE = 2 or 3, the problem is A\*B\*x = lambda\*x or
B\*A\*x = lambda\*x, and A is overwritten by U\*A\*U\*\*T or L\*\*T \*A\*L.

B must have been previously factorized as U\*\*T \*U or L\*L\*\*T by DPOTRF.

## Parameters
ITYPE : INTEGER [in]
> = 1: compute inv(U\*\*T)\*A\*inv(U) or inv(L)\*A\*inv(L\*\*T);
> = 2 or 3: compute U\*A\*U\*\*T or L\*\*T \*A\*L.

UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is stored, and how B has been factorized.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the matrices A and B.  N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> n by n upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading n by n lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> 
> On exit, if INFO = 0, the transformed matrix, stored in the
> same format as A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

B : DOUBLE PRECISION array, dimension (LDB,N) [in]
> The triangular factor from the Cholesky factorization of B,
> as returned by DPOTRF.

LDB : INTEGER [in]
> The leading dimension of the array B.  LDB >= max(1,N).

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
