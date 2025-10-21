```fortran
double precision function zla_syrcond_x (
        character uplo,
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

ZLA_SYRCOND_X Computes the infinity norm condition number of
op(A) \* diag(X) where X is a COMPLEX\*16 vector.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

A : COMPLEX\*16 array, dimension (LDA,N) [in]
> On entry, the N-by-N matrix A.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

AF : COMPLEX\*16 array, dimension (LDAF,N) [in]
> The block diagonal matrix D and the multipliers used to
> obtain the factor U or L as computed by ZSYTRF.

LDAF : INTEGER [in]
> The leading dimension of the array AF.  LDAF >= max(1,N).

IPIV : INTEGER array, dimension (N) [in]
> Details of the interchanges and the block structure of D
> as determined by ZSYTRF.

X : COMPLEX\*16 array, dimension (N) [in]
> The vector X in the formula op(A) \* diag(X).

INFO : INTEGER [out]
> = 0:  Successful exit.
> i > 0:  The ith argument is invalid.

WORK : COMPLEX\*16 array, dimension (2\*N). [out]
> Workspace.

RWORK : DOUBLE PRECISION array, dimension (N). [out]
> Workspace.
