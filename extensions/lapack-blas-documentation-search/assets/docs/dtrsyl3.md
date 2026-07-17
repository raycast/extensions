```fortran
subroutine dtrsyl3 (
        character trana,
        character tranb,
        integer isgn,
        integer m,
        integer n,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision, dimension( ldc, * ) c,
        integer ldc,
        double precision scale,
        integer, dimension( * ) iwork,
        integer liwork,
        double precision, dimension( ldswork, * ) swork,
        integer ldswork,
        integer info
)
```

DTRSYL3 solves the real Sylvester matrix equation:

op(A)\*X + X\*op(B) = scale\*C or
op(A)\*X - X\*op(B) = scale\*C,

where op(A) = A or A\*\*T, and  A and B are both upper quasi-
triangular. A is M-by-M and B is N-by-N; the right hand side C and
the solution X are M-by-N; and scale is an output scale factor, set
<= 1 to avoid overflow in X.

A and B must be in Schur canonical form (as returned by DHSEQR), that
is, block upper triangular with 1-by-1 and 2-by-2 diagonal blocks;
each 2-by-2 diagonal block has its diagonal elements equal and its
off-diagonal elements of opposite sign.

This is the block version of the algorithm.

## Parameters
TRANA : CHARACTER\*1 [in]
> Specifies the option op(A):
> = 'N': op(A) = A    (No transpose)
> = 'T': op(A) = A\*\*T (Transpose)
> = 'C': op(A) = A\*\*H (Conjugate transpose = Transpose)

TRANB : CHARACTER\*1 [in]
> Specifies the option op(B):
> = 'N': op(B) = B    (No transpose)
> = 'T': op(B) = B\*\*T (Transpose)
> = 'C': op(B) = B\*\*H (Conjugate transpose = Transpose)

ISGN : INTEGER [in]
> Specifies the sign in the equation:
> = +1: solve op(A)\*X + X\*op(B) = scale\*C
> = -1: solve op(A)\*X - X\*op(B) = scale\*C

M : INTEGER [in]
> The order of the matrix A, and the number of rows in the
> matrices X and C. M >= 0.

N : INTEGER [in]
> The order of the matrix B, and the number of columns in the
> matrices X and C. N >= 0.

A : DOUBLE PRECISION array, dimension (LDA,M) [in]
> The upper quasi-triangular matrix A, in Schur canonical form.

LDA : INTEGER [in]
> The leading dimension of the array A. LDA >= max(1,M).

B : DOUBLE PRECISION array, dimension (LDB,N) [in]
> The upper quasi-triangular matrix B, in Schur canonical form.

LDB : INTEGER [in]
> The leading dimension of the array B. LDB >= max(1,N).

C : DOUBLE PRECISION array, dimension (LDC,N) [in,out]
> On entry, the M-by-N right hand side matrix C.
> On exit, C is overwritten by the solution matrix X.

LDC : INTEGER [in]
> The leading dimension of the array C. LDC >= max(1,M)

SCALE : DOUBLE PRECISION [out]
> The scale factor, scale, set <= 1 to avoid overflow in X.

IWORK : INTEGER array, dimension (MAX(1,LIWORK)) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : IWORK is INTEGER [in]
> The dimension of the array IWORK. LIWORK >=  ((M + NB - 1) / NB + 1)
> + ((N + NB - 1) / NB + 1), where NB is the optimal block size.
> 
> If LIWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal dimension of the IWORK array,
> returns this value as the first entry of the IWORK array, and
> no error message related to LIWORK is issued by XERBLA.

SWORK : DOUBLE PRECISION array, dimension (MAX(2, ROWS), [out]
> MAX(1,COLS)).
> On exit, if INFO = 0, SWORK(1) returns the optimal value ROWS
> and SWORK(2) returns the optimal COLS.

LDSWORK : INTEGER [in]
> LDSWORK >= MAX(2,ROWS), where ROWS = ((M + NB - 1) / NB + 1)
> and NB is the optimal block size.
> 
> If LDSWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal dimensions of the SWORK matrix,
> returns these values as the first and second entry of the SWORK
> matrix, and no error message related LWORK is issued by XERBLA.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
> = 1: A and B have common or very close eigenvalues; perturbed
> values were used to solve the equation (but the matrices
> A and B are unchanged).
