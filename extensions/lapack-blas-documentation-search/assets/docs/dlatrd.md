```fortran
subroutine dlatrd (
        character uplo,
        integer n,
        integer nb,
        double precision, dimension( lda, * ) a,
        integer lda,
        double precision, dimension( * ) e,
        double precision, dimension( * ) tau,
        double precision, dimension( ldw, * ) w,
        integer ldw
)
```

DLATRD reduces NB rows and columns of a real symmetric matrix A to
symmetric tridiagonal form by an orthogonal similarity
transformation Q\*\*T \* A \* Q, and returns the matrices V and W which are
needed to apply the transformation to the unreduced part of A.

If UPLO = 'U', DLATRD reduces the last NB rows and columns of a
matrix, of which the upper triangle is supplied;
if UPLO = 'L', DLATRD reduces the first NB rows and columns of a
matrix, of which the lower triangle is supplied.

This is an auxiliary routine called by DSYTRD.

## Parameters
UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> symmetric matrix A is stored:
> = 'U': Upper triangular
> = 'L': Lower triangular

N : INTEGER [in]
> The order of the matrix A.

NB : INTEGER [in]
> The number of rows and columns to be reduced.

A : DOUBLE PRECISION array, dimension (LDA,N) [in,out]
> On entry, the symmetric matrix A.  If UPLO = 'U', the leading
> n-by-n upper triangular part of A contains the upper
> triangular part of the matrix A, and the strictly lower
> triangular part of A is not referenced.  If UPLO = 'L', the
> leading n-by-n lower triangular part of A contains the lower
> triangular part of the matrix A, and the strictly upper
> triangular part of A is not referenced.
> On exit:
> if UPLO = 'U', the last NB columns have been reduced to
> tridiagonal form, with the diagonal elements overwriting
> the diagonal elements of A; the elements above the diagonal
> with the array TAU, represent the orthogonal matrix Q as a
> product of elementary reflectors;
> if UPLO = 'L', the first NB columns have been reduced to
> tridiagonal form, with the diagonal elements overwriting
> the diagonal elements of A; the elements below the diagonal
> with the array TAU, represent the  orthogonal matrix Q as a
> product of elementary reflectors.
> See Further Details.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= (1,N).

E : DOUBLE PRECISION array, dimension (N-1) [out]
> If UPLO = 'U', E(n-nb:n-1) contains the superdiagonal
> elements of the last NB columns of the reduced matrix;
> if UPLO = 'L', E(1:nb) contains the subdiagonal elements of
> the first NB columns of the reduced matrix.

TAU : DOUBLE PRECISION array, dimension (N-1) [out]
> The scalar factors of the elementary reflectors, stored in
> TAU(n-nb:n-1) if UPLO = 'U', and in TAU(1:nb) if UPLO = 'L'.
> See Further Details.

W : DOUBLE PRECISION array, dimension (LDW,NB) [out]
> The n-by-nb matrix W required to update the unreduced part
> of A.

LDW : INTEGER [in]
> The leading dimension of the array W. LDW >= max(1,N).
