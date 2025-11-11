```fortran
double precision function zla_gercond_x (
        character trans,
        integer n,
        complex*16, dimension( lda, * ) a,
        integer lda,
        complex*16, dimension( ldaf, * ) af,
        integer ldaf,
        integer, dimension( * ) ipiv,
        complex*16, dimension( * ) x,
        integer info,
        complex*16, dimension( * ) work,
        double precision, dimension( * ) rwork
)
```

ZLA_GERCOND_X computes the infinity norm condition number of
op(A) \* diag(X) where X is a COMPLEX\*16 vector.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate Transpose = Transpose)

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX\*16 array, dimension (LDAF,N) [in]
> The factors L and U from the factorization
> A = P\*L\*U as computed by ZGETRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from the factorization A = P\*L\*U
> as computed by ZGETRF; row i of the matrix was interchanged
> with row IPIV(i).

X : COMPLEX\*16 array, dimension (N) [in]
> The vector X in the formula op(A) \* diag(X).

INFO : INTEGER [out]
> = 0:  Successful exit.
> i > 0:  The ith argument is invalid.

WORK : COMPLEX\*16 array, dimension (2\*N). [out]
> Workspace.

RWORK : DOUBLE PRECISION array, dimension (N). [out]
> Workspace.
